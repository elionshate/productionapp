import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const dbPath = PrismaService.resolveDbPath();
    console.log(`[PrismaService] Database path: ${dbPath}`);

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    console.log('[PrismaService] Connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    console.log('[PrismaService] Disconnected from database');
  }

  /**
   * Initialize database schema using Prisma migrations.
   * This ensures data persists across rebuilds.
   */
  static initializeProductionDb(dbPath: string): void {
    const rawDb = new Database(dbPath);
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');
    rawDb.close();

    // Use Prisma migrations to manage schema changes safely
    const isElectron = process.env.DATABASE_PATH !== undefined;
    
    try {
      // Set DATABASE_URL for Prisma CLI
      const dbUrl = `file:${dbPath}`;
      const env = { ...process.env, DATABASE_URL: dbUrl };
      
      // Find prisma schema location
      let schemaPath: string;
      if (isElectron) {
        // In Electron, schema is in the app.asar or unpacked resources
        const appRoot = path.join(__dirname, '../../..');
        schemaPath = path.join(appRoot, 'prisma', 'schema.prisma');
        
        // Check if schema exists in app.asar location
        if (!fs.existsSync(schemaPath)) {
          // Try apps/api/prisma location
          schemaPath = path.join(appRoot, 'apps', 'api', 'prisma', 'schema.prisma');
        }
      } else {
        // In development
        schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      }
      
      console.log(`[PrismaService] Applying migrations from: ${schemaPath}`);
      
      // Apply migrations (prisma migrate deploy)
      // This safely applies all pending migrations without data loss
      execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
        env,
        stdio: 'inherit',
      });
      
      console.log('[PrismaService] Database migrations applied successfully');
    } catch (error) {
      console.error('[PrismaService] Failed to apply migrations:', error);
      // Don't throw - allow app to start even if migrations fail
      // This prevents complete app failure on migration issues
    }
  }

  private static resolveDbPath(): string {
    // Check DATABASE_PATH first (set by Electron's ServerManager)
    const envPath = process.env.DATABASE_PATH;
    if (envPath) {
      return envPath;
    }
    // Fallback: check DATABASE_URL (Prisma convention)
    const envUrl = process.env.DATABASE_URL;
    if (envUrl) {
      return envUrl.replace('file:', '');
    }
    return path.join(process.cwd(), 'dev.db');
  }
}