import { ChildProcess, fork } from 'child_process';
import { utilityProcess } from 'electron';
import type { UtilityProcess } from 'electron';
import * as path from 'path';
import * as net from 'net';

/**
 * ServerManager
 * Spawns the NestJS API server as a child process and manages its lifecycle.
 *
 * Development:  child_process.fork()  — uses system Node.js, IPC channel
 * Production:   utilityProcess.fork() — Electron's built-in Node.js with ASAR support
 *
 * CRITICAL: In production the API entry point MUST stay INSIDE app.asar so that
 * standard require() resolution finds node_modules/ within the same archive.
 * Only native .node binaries (better-sqlite3) are unpacked via asarUnpack.
 */
export class ServerManager {
  private child: ChildProcess | UtilityProcess | null = null;
  private _port: number | null = null;
  private isDev: boolean = true;
  private _dbPath: string | null = null;
  private _stopping: boolean = false;
  private _onCrash: ((code: number | null) => void) | null = null;

  get port(): number | null {
    return this._port;
  }

  /** Register a callback invoked if the server crashes after successful startup */
  onCrash(callback: (code: number | null) => void): void {
    this._onCrash = callback;
  }

  /** Find a free TCP port starting from the preferred port (iterative) */
  private findFreePort(preferred: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const tryPort = (port: number) => {
        if (port > 65535) {
          reject(new Error('No available port found'));
          return;
        }
        const server = net.createServer();
        server.listen(port, '127.0.0.1', () => {
          const addr = server.address();
          const foundPort = typeof addr === 'object' && addr ? addr.port : port;
          server.close(() => resolve(foundPort));
        });
        server.on('error', () => tryPort(port + 1));
      };
      tryPort(preferred);
    });
  }

  /**
   * Start the NestJS server.
   * Resolves with the port number once the server sends "ready" IPC message.
   */
  async start(dbPath: string): Promise<number> {
    this._dbPath = dbPath;
    const port = await this.findFreePort(4123);

    const isDev = !require('electron').app.isPackaged;
    this.isDev = isDev;

    // ── Resolve API entry point ──────────────────────────────────────
    // __dirname at runtime:
    //   dev  → <project>/dist/electron/main
    //   prod → <resources>/app.asar/dist/electron/main
    //
    // In BOTH cases the compiled API sits at ../../api/main.js relative
    // to __dirname.  In production this yields a path INSIDE app.asar,
    // which is exactly what we want — utilityProcess.fork() has full
    // ASAR transparency, so require('reflect-metadata') etc. will
    // resolve to app.asar/node_modules/ via normal Node resolution.
    const serverEntry = path.join(__dirname, '..', '..', 'api', 'main.js');

    // CWD: dev → project root; prod → userData (writable dir for logs)
    const projectRoot = isDev
      ? path.join(__dirname, '..', '..', '..')
      : require('electron').app.getPath('userData');

    console.log(`[ServerManager] Entry : ${serverEntry}`);
    console.log(`[ServerManager] CWD   : ${projectRoot}`);
    console.log(`[ServerManager] Port  : ${port}`);
    console.log(`[ServerManager] isDev : ${isDev}`);

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      PORT: String(port),
      DATABASE_PATH: dbPath,
      NODE_ENV: isDev ? 'development' : 'production',
    };

    // ── Spawn ────────────────────────────────────────────────────────
    if (isDev) {
      /* Development: child_process.fork (system Node, IPC) */
      this.child = fork(serverEntry, [], {
        cwd: projectRoot,
        env,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });
      this.child.stdout?.on('data', (d) => process.stdout.write(`[API] ${d}`));
      this.child.stderr?.on('data', (d) => process.stderr.write(`[API:ERR] ${d}`));
    } else {
      /* Production: utilityProcess.fork (Electron Node, ASAR-aware) */
      this.child = utilityProcess.fork(serverEntry, [], {
        env,
        stdio: 'pipe',
        // NOTE: do NOT pass cwd — utilityProcess inherits the main
        // process CWD, and setting it to an ASAR path would break
        // native-module loading.
      });
      this.child.stdout?.on('data', (d) => process.stdout.write(`[API] ${d}`));
      this.child.stderr?.on('data', (d) => process.stderr.write(`[API:ERR] ${d}`));
    }

    // ── Wait for "ready" IPC message OR HTTP polling ───────────────
    return new Promise<number>((resolve, reject) => {
      let resolved = false;
      const done = (p: number) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        clearInterval(pollTimer);
        this._port = p;
        console.log(`[ServerManager] ✓ Server ready on port ${this._port}`);
        resolve(this._port!);
      };

      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        clearInterval(pollTimer);
        reject(new Error('[ServerManager] Server did not become ready within 30 s'));
      }, 30_000);

      // Primary: listen for IPC "ready" message
      this.child!.on('message', (msg: any) => {
        if (msg && msg.type === 'ready') {
          done(msg.port ?? port);
        }
      });

      // Fallback: poll the HTTP endpoint every 500ms in case IPC fails
      const pollTimer = setInterval(() => {
        if (resolved) return;
        const http = require('http');
        const req = http.get(`http://127.0.0.1:${port}/api`, (res: any) => {
          // Any response (even 404) means the server is listening
          if (res.statusCode !== undefined) {
            done(port);
          }
          res.resume(); // consume response data
        });
        req.on('error', () => { /* server not ready yet, will retry */ });
        req.setTimeout(400, () => req.destroy());
      }, 500);

      if (isDev) {
        const cp = this.child as ChildProcess;
        cp.on('exit', (code) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            clearInterval(pollTimer);
            console.log(`[ServerManager] Server exited with code ${code}`);
            reject(new Error(`Server exited prematurely (code ${code})`));
          } else {
            // Post-startup crash — notify via callback
            if (!this._stopping && this._onCrash) {
              console.error(`[ServerManager] Server crashed post-startup with code ${code}`);
              this._onCrash(code);
            }
          }
        });
        cp.on('error', (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            clearInterval(pollTimer);
            reject(err);
          }
        });
      } else {
        const up = this.child as UtilityProcess;
        up.on('exit', (code) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            clearInterval(pollTimer);
            console.log(`[ServerManager] Server exited with code ${code}`);
            reject(new Error(`Server exited prematurely (code ${code})`));
          } else {
            // Post-startup crash — notify via callback
            if (!this._stopping && this._onCrash) {
              console.error(`[ServerManager] Server crashed post-startup with code ${code}`);
              this._onCrash(code);
            }
          }
        });
      }
    });
  }

  /** Gracefully stop the server: SIGTERM → wait 5s → SIGKILL */
  async stop(): Promise<void> {
    if (!this.child) return;
    this._stopping = true;
    console.log('[ServerManager] Stopping server...');

    // First attempt: graceful kill (SIGTERM on Unix, TerminateProcess on Windows)
    this.child.kill();

    await new Promise<void>((resolve) => {
      const forceKillTimer = setTimeout(() => {
        // Escalate: force kill if still alive after 5s
        try {
          if (this.child) {
            console.log('[ServerManager] Force-killing server (timeout)...');
            if (this.isDev) {
              (this.child as ChildProcess).kill('SIGKILL');
            } else {
              this.child.kill();
            }
          }
        } catch { /* already dead */ }
        resolve();
      }, 5000);

      if (this.isDev) {
        (this.child! as ChildProcess).on('exit', () => {
          clearTimeout(forceKillTimer);
          resolve();
        });
      } else {
        (this.child! as UtilityProcess).on('exit', () => {
          clearTimeout(forceKillTimer);
          resolve();
        });
      }
    });

    this.child = null;
    this._port = null;
    this._stopping = false;
  }
}
