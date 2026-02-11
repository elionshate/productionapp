import { app, BrowserWindow, dialog, ipcMain, protocol, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { autoUpdater } from 'electron-updater';
import { ServerManager } from './server-manager';

// Replaces ESM-only 'electron-is-dev' package (v3.x is not compatible with CJS)
const isDev = !app.isPackaged;

// ── Single Instance Lock ────────────────────────────────────
// Prevents multiple instances from running simultaneously, which causes
// database locks, memory exhaustion, and freezing on low-end hardware.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running — quit immediately
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
const serverManager = new ServerManager();

// __dirname is dist/electron/main/ at runtime — go up 3 levels to reach project root
const appRoot = path.join(__dirname, '../../..');

// Check if a Next.js static build exists (from 'next build' with output: 'export')
const hasStaticBuild = fs.existsSync(path.join(appRoot, 'out', 'index.html'));

// Use dev server only when unpackaged AND no static build available
const useDevServer = isDev && !hasStaticBuild;

function getDbPath(): string {
  if (isDev) {
    return path.join(appRoot, 'dev.db');
  }
  return path.join(app.getPath('userData'), 'production.db');
}

function createWindow(apiPort: number) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(appRoot, 'public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (useDevServer) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://./index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register custom 'app://' protocol for serving static files (production + local testing with built output)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.whenReady().then(async () => {
  // When a second instance tries to launch, focus the existing window
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  try {
    // Register protocol handler for serving static files
    if (!useDevServer) {
      protocol.handle('app', (request) => {
        const { pathname } = new URL(request.url);
        const filePath = path.join(appRoot, 'out', decodeURIComponent(pathname));
        return net.fetch(url.pathToFileURL(filePath).toString());
      });
    }

    // Start the NestJS API server
    const dbPath = getDbPath();
    console.log(`[Electron] Database path: ${dbPath}`);

    // Ensure userData dir exists (for production)
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const apiPort = await serverManager.start(dbPath);
    console.log(`[Electron] API server ready on port ${apiPort}`);

    // Create window after server is ready — pass port via env for preload
    process.env.API_PORT = String(apiPort);

    // Handle IPC request for API port from renderer
    ipcMain.handle('get-api-port', () => apiPort);

    // Handle native app version
    ipcMain.handle('get-app-version', () => app.getVersion());

    // Handle native image selection dialog
    ipcMain.handle('select-image', async () => {
      try {
        const result = await dialog.showOpenDialog(mainWindow!, {
          title: 'Select Image',
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
          ],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: true, data: null };
        }

        const filePath = result.filePaths[0];
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        const mimeMap: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
        };
        const mime = mimeMap[ext] || 'image/png';
        const base64 = fileBuffer.toString('base64');
        return { success: true, data: `data:${mime};base64,${base64}` };
      } catch (error) {
        console.error('[IPC] select-image failed:', error);
        return { success: false, error: String(error) };
      }
    });

    createWindow(apiPort);

    // ===== AUTO-UPDATER SETUP =====
    if (!isDev) {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.logger = console;

      autoUpdater.on('update-available', (info) => {
        console.log('[AutoUpdater] Update available:', info.version);
        mainWindow?.webContents.send('update-status', {
          status: 'available',
          version: info.version,
        });
      });

      autoUpdater.on('update-not-available', () => {
        console.log('[AutoUpdater] No update available');
        mainWindow?.webContents.send('update-status', { status: 'up-to-date' });
      });

      autoUpdater.on('download-progress', (progress) => {
        console.log(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
        mainWindow?.webContents.send('update-status', {
          status: 'downloading',
          percent: Math.round(progress.percent),
        });
      });

      autoUpdater.on('update-downloaded', (info) => {
        console.log('[AutoUpdater] Update downloaded:', info.version);
        mainWindow?.webContents.send('update-status', {
          status: 'downloaded',
          version: info.version,
        });
      });

      autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater] Error:', err.message);
        mainWindow?.webContents.send('update-status', {
          status: 'error',
          error: err.message,
        });
      });

      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
          console.error('[AutoUpdater] Check failed:', err.message);
        });
      }, 5000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(apiPort);
      }
    });
  } catch (error) {
    console.error('[APP] Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await serverManager.stop();
});
