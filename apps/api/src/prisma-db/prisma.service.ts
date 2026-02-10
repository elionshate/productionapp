import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

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
   * Initialize database schema in production mode.
   * In dev, Prisma migrations handle this.
   */
  static initializeProductionDb(dbPath: string): void {
    const rawDb = new Database(dbPath);
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');

    const CURRENT_SCHEMA_VERSION = 3;
    const tableCheck = rawDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();

    if (!tableCheck) {
      console.log('[PrismaService] Fresh database — creating schema...');
      rawDb.exec(SCHEMA_SQL);
      rawDb.exec(`CREATE TABLE IF NOT EXISTS "_schema_version" ("version" INTEGER NOT NULL DEFAULT 0)`);
      rawDb.exec(`INSERT INTO "_schema_version" ("version") VALUES (${CURRENT_SCHEMA_VERSION})`);
      console.log(`[PrismaService] Schema created (v${CURRENT_SCHEMA_VERSION})`);
    } else {
      const versionTableExists = rawDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'"
      ).get();
      let dbVersion = 0;
      if (versionTableExists) {
        const row = rawDb.prepare('SELECT version FROM "_schema_version" LIMIT 1').get() as { version: number } | undefined;
        dbVersion = row?.version ?? 0;
      }

      if (dbVersion < CURRENT_SCHEMA_VERSION) {
        console.log(`[PrismaService] Schema outdated (v${dbVersion} → v${CURRENT_SCHEMA_VERSION})`);
        rawDb.pragma('foreign_keys = OFF');
        const tablesToDrop = [
          'material_requirements', 'manufacturing_orders', 'order_items', 'orders',
          'inventory_transactions', 'inventory', 'product_stock', 'product_elements',
          'products', 'elements', 'colors',
        ];
        for (const t of tablesToDrop) {
          rawDb.exec(`DROP TABLE IF EXISTS "${t}"`);
        }
        rawDb.exec(`DROP INDEX IF EXISTS "product_elements_product_id_element_id_color_id_key"`);
        rawDb.exec(`DROP INDEX IF EXISTS "inventory_element_id_color_id_key"`);
        rawDb.exec(`DROP INDEX IF EXISTS "material_requirements_manufacturing_order_id_element_id_color_id_key"`);
        rawDb.pragma('foreign_keys = ON');
        rawDb.exec(SCHEMA_SQL);
        rawDb.exec(`CREATE TABLE IF NOT EXISTS "_schema_version" ("version" INTEGER NOT NULL DEFAULT 0)`);
        rawDb.exec(`DELETE FROM "_schema_version"`);
        rawDb.exec(`INSERT INTO "_schema_version" ("version") VALUES (${CURRENT_SCHEMA_VERSION})`);
        console.log(`[PrismaService] Schema upgraded to v${CURRENT_SCHEMA_VERSION}`);
      }
    }

    rawDb.close();
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

// Consolidated schema SQL for production database initialization
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

CREATE TABLE IF NOT EXISTS "raw_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "stock_qty" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "raw_materials_name_key" ON "raw_materials"("name");

CREATE TABLE IF NOT EXISTS "raw_material_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raw_material_id" TEXT NOT NULL,
    "change_amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raw_material_transactions_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unique_name" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL,
    "color_2" TEXT,
    "is_dual_color" BOOLEAN NOT NULL DEFAULT 0,
    "material" TEXT NOT NULL,
    "raw_material_id" TEXT,
    "weight_grams" DECIMAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "elements_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serial_number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "units_per_assembly" INTEGER NOT NULL DEFAULT 1,
    "units_per_box" INTEGER NOT NULL DEFAULT 1,
    "box_raw_material_id" TEXT,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_box_raw_material_id_fkey" FOREIGN KEY ("box_raw_material_id") REFERENCES "raw_materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "products_serial_number_key" ON "products"("serial_number");

CREATE TABLE IF NOT EXISTS "product_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "quantity_needed" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_elements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_elements_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_elements_product_id_element_id_key" ON "product_elements"("product_id", "element_id");

CREATE TABLE IF NOT EXISTS "inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT NOT NULL UNIQUE,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "product_stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "stock_boxed_amount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_stock_product_id_key" ON "product_stock"("product_id");

CREATE TABLE IF NOT EXISTS "inventory_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transactions_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" INTEGER NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipped_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "orders"("order_number");

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "boxes_needed" INTEGER NOT NULL,
    "boxes_assembled" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "manufacturing_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_to_make" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manufacturing_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "manufacturing_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "material_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturing_order_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "quantity_needed" INTEGER NOT NULL,
    "quantity_produced" INTEGER NOT NULL DEFAULT 0,
    "total_weight_grams" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_requirements_manufacturing_order_id_fkey" FOREIGN KEY ("manufacturing_order_id") REFERENCES "manufacturing_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_requirements_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "material_requirements_manufacturing_order_id_element_id_key" ON "material_requirements"("manufacturing_order_id", "element_id");
`;
