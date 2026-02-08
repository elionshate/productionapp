import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import { autoUpdater } from 'electron-updater';
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import type {
  CreateOrderDTO,
  UpdateOrderDTO,
  CreateManufacturingOrderDTO,
  UpdateManufacturingOrderDTO,
  CreateInventoryTransactionDTO,
  CreateProductDTO,
  CreateColorDTO,
  CreateElementDTO,
  RecordProductionDTO,
  IPCResponse,
} from '../types/ipc';

let mainWindow: BrowserWindow | null = null;
let isDbInitialized = false;

// __dirname is dist/main/main/ at runtime — go up 3 levels to reach project root
const appRoot = path.join(__dirname, '../../..');

// Determine the database path
function getDbPath(): string {
  if (isDev) {
    return path.join(appRoot, 'dev.db');
  }
  return path.join(app.getPath('userData'), 'production.db');
}

// Initialize Prisma Client with better-sqlite3 adapter (Prisma 7 requirement)
const dbPath = getDbPath();
console.log(`[DB] Database path: ${dbPath}`);
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({
  adapter,
  log: isDev ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Initialize Database on App Startup
 * In production: creates tables via raw SQL if they don't exist (no CLI needed)
 * In development: database is already set up via prisma migrate dev
 */
async function initializeDatabase() {
  if (isDbInitialized) return;

  console.log('[DB] Initializing database...');

  if (!isDev) {
    const prodDbPath = path.join(app.getPath('userData'), 'production.db');
    console.log(`[DB] Production database path: ${prodDbPath}`);

    // Ensure the userData directory exists
    const userDataDir = path.dirname(prodDbPath);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Open the database directly with better-sqlite3 and create tables if missing
    const rawDb = new Database(prodDbPath);
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');

    // Check if schema already exists by looking for the users table
    const tableCheck = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableCheck) {
      console.log('[DB] Fresh database — creating schema...');
      rawDb.exec(SCHEMA_SQL);
      console.log('[DB] Schema created successfully');
    } else {
      console.log('[DB] Database schema already exists');
    }

    rawDb.close();
  } else {
    console.log('[DB] Development mode - using existing database');
  }

  isDbInitialized = true;
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

CREATE TABLE IF NOT EXISTS "colors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "color_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "colors_color_name_key" ON "colors"("color_name");

CREATE TABLE IF NOT EXISTS "elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unique_name" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "weight_grams" DECIMAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serial_number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "units_per_assembly" INTEGER NOT NULL DEFAULT 1,
    "units_per_box" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "products_serial_number_key" ON "products"("serial_number");

CREATE TABLE IF NOT EXISTS "product_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "quantity_needed" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_elements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_elements_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_elements_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_elements_product_id_element_id_color_id_key" ON "product_elements"("product_id", "element_id", "color_id");

CREATE TABLE IF NOT EXISTS "inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_element_id_color_id_key" ON "inventory"("element_id", "color_id");

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
    "color_id" TEXT,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transactions_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_transactions_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" INTEGER NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "color_id" TEXT NOT NULL,
    "quantity_needed" INTEGER NOT NULL,
    "quantity_produced" INTEGER NOT NULL DEFAULT 0,
    "total_weight_grams" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_requirements_manufacturing_order_id_fkey" FOREIGN KEY ("manufacturing_order_id") REFERENCES "manufacturing_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_requirements_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "material_requirements_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "material_requirements_manufacturing_order_id_element_id_color_id_key" ON "material_requirements"("manufacturing_order_id", "element_id", "color_id");
`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(appRoot, 'public/icon.png'), // App icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Security: Disable Node.js integration
      contextIsolation: true,  // Security: Enable context isolation
      sandbox: true,           // Security: Enable sandbox
    },
  });

  // In development, load from Next.js dev server
  // In production, load via custom 'app://' protocol (handles absolute asset paths correctly)
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL('app://./index.html');
  }

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register custom 'app://' protocol for serving static files in production
// Must be called before app.whenReady()
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ]);
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Register the custom protocol handler for production
    if (!isDev) {
      protocol.handle('app', (request) => {
        const { pathname } = new URL(request.url);
        // Serve files from the out/ directory
        const filePath = path.join(appRoot, 'out', decodeURIComponent(pathname));
        return net.fetch(url.pathToFileURL(filePath).toString());
      });
    }

    // CRITICAL: Initialize database BEFORE creating window
    await initializeDatabase();
    
    // Create window after database is ready
    createWindow();

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

      // Check for updates after a short delay
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
          console.error('[AutoUpdater] Check failed:', err.message);
        });
      }, 5000);
    }

    app.on('activate', () => {
      // On macOS, re-create window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[APP] Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running until explicit quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================================
// IPC HANDLERS (Secure Database Communication)
// ============================================================================
// All database operations run in the Main Process with Prisma Client.
// Renderer process communicates via type-safe IPC channels.
// Error handling: All handlers wrap operations in try/catch and return IPCResponse<T>

// ========== AUTO-UPDATE IPC ==========
ipcMain.handle('updater:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('updater:checkForUpdates', async () => {
  if (isDev) return { status: 'dev-mode' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checking', version: result?.updateInfo?.version };
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
});

ipcMain.handle('updater:quitAndInstall', () => {
  autoUpdater.quitAndInstall(false, true);
});

/**
 * Serialize Prisma results for safe IPC transport.
 * Converts Prisma Decimal objects to plain numbers (Decimal is not cloneable
 * via Electron's structured-clone algorithm, causing IPC calls to hang).
 */
function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    // Prisma Decimal has a toNumber() method
    if (value !== null && value !== undefined && typeof value === 'object' && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return value;
  }));
}

// ========== SYSTEM ==========
ipcMain.handle('ping', async () => {
  return 'pong';
});

// ========== DIALOG ==========
ipcMain.handle('dialog:selectImage', async (): Promise<IPCResponse<string | null>> => {
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
    const dataUrl = `data:${mime};base64,${base64}`;

    return { success: true, data: dataUrl };
  } catch (error) {
    console.error('[IPC] dialog:selectImage failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== AUTH ==========
ipcMain.handle('auth:hasUsers', async (): Promise<IPCResponse<boolean>> => {
  try {
    const count = await prisma.user.count();
    return { success: true, data: count > 0 };
  } catch (error) {
    console.error('[IPC] auth:hasUsers failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('auth:register', async (_event, data: { username: string; password: string }): Promise<IPCResponse<any>> => {
  try {
    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      return { success: false, error: 'Username already exists' };
    }

    // Simple hash: base64 encode for local-only auth
    // (No network exposure - acceptable for local desktop app)
    const hashedPassword = Buffer.from(data.password).toString('base64');

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
      },
    });

    return {
      success: true,
      data: { id: user.id, username: user.username, createdAt: user.createdAt },
    };
  } catch (error) {
    console.error('[IPC] auth:register failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('auth:login', async (_event, data: { username: string; password: string }): Promise<IPCResponse<any>> => {
  try {
    const user = await prisma.user.findUnique({ where: { username: data.username } });
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const hashedPassword = Buffer.from(data.password).toString('base64');
    if (user.password !== hashedPassword) {
      return { success: false, error: 'Invalid username or password' };
    }

    return {
      success: true,
      data: { id: user.id, username: user.username, createdAt: user.createdAt },
    };
  } catch (error) {
    console.error('[IPC] auth:login failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== ORDERS ==========
ipcMain.handle('orders:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        manufacturingOrders: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: serialize(orders) };
  } catch (error) {
    console.error('[IPC] orders:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('orders:getById', async (_event, id: string): Promise<IPCResponse<any>> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                productElements: {
                  include: {
                    element: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
        manufacturingOrders: {
          include: {
            requirements: {
              include: {
                element: true,
                color: true,
              },
            },
            product: true,
          },
        },
      },
    });
    return { success: true, data: serialize(order) };
  } catch (error) {
    console.error('[IPC] orders:getById failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('orders:create', async (_event, data: CreateOrderDTO): Promise<IPCResponse<any>> => {
  try {
    // Auto-generate sequential order number (max + 1)
    const result = await prisma.$queryRaw<{ max_num: number | null }[]>`SELECT MAX(order_number) as max_num FROM orders`;
    const maxNum = result[0]?.max_num ?? 0;
    const nextOrderNumber = Number(maxNum) + 1;

    // Generate a cuid for the new order
    const orderId = crypto.randomUUID();
    const status = data.status ?? 'pending';
    const notes = data.notes ?? null;

    // Insert order using raw SQL to avoid adapter @map() field mapping issues
    await prisma.$executeRaw`INSERT INTO orders (id, order_number, client_name, status, notes, created_at) VALUES (${orderId}, ${nextOrderNumber}, ${data.clientName}, ${status}, ${notes}, datetime('now'))`;

    // Insert order items if any
    for (const item of data.items) {
      const itemId = crypto.randomUUID();
      await prisma.$executeRaw`INSERT INTO order_items (id, order_id, product_id, boxes_needed, created_at) VALUES (${itemId}, ${orderId}, ${item.productId}, ${item.boxesNeeded}, datetime('now'))`;
    }

    // Auto-generate manufacturing orders + material requirements when status is 'in_production'
    if (status === 'in_production' && data.items.length > 0) {
      // Query products with their elements for material requirement generation
      const orderWithElements = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  productElements: {
                    include: {
                      element: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (orderWithElements?.orderItems) {
        for (const item of orderWithElements.orderItems) {
          const totalUnits = item.boxesNeeded * (item.product?.unitsPerBox ?? 1);

          // Create manufacturing order
          const mfgOrder = await prisma.manufacturingOrder.create({
            data: {
              orderId: orderId,
              productId: item.productId,
              quantityToMake: totalUnits,
              status: 'in_progress',
            },
          });

          // Generate material requirements from product elements
          if (item.product?.productElements) {
            for (const pe of item.product.productElements) {
              const quantityNeeded = pe.quantityNeeded * totalUnits;
              const totalWeightGrams = Number(pe.element?.weightGrams ?? 0) * quantityNeeded;

              await prisma.materialRequirement.upsert({
                where: {
                  manufacturingOrderId_elementId_colorId: {
                    manufacturingOrderId: mfgOrder.id,
                    elementId: pe.elementId,
                    colorId: pe.colorId,
                  },
                },
                create: {
                  manufacturingOrderId: mfgOrder.id,
                  elementId: pe.elementId,
                  colorId: pe.colorId,
                  quantityNeeded,
                  totalWeightGrams,
                },
                update: {
                  quantityNeeded,
                  totalWeightGrams,
                },
              });
            }
          }
        }
      }
    }

    // Query back the full order with includes
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        manufacturingOrders: {
          include: {
            requirements: {
              include: {
                element: true,
                color: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: serialize(order) };
  } catch (error) {
    console.error('[IPC] orders:create failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('orders:update', async (_event, id: string, data: UpdateOrderDTO): Promise<IPCResponse<any>> => {
  try {
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                productElements: {
                  include: {
                    element: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Auto-generate manufacturing orders + material requirements when status → in_production
    if (data.status === 'in_production' && order.orderItems) {
      for (const item of order.orderItems) {
        // Check if a manufacturing order already exists for this order+product
        const existing = await prisma.manufacturingOrder.findFirst({
          where: { orderId: id, productId: item.productId },
        });
        if (existing) continue;

        const totalUnits = item.boxesNeeded * (item.product?.unitsPerBox ?? 1);

        // Create manufacturing order
        const mfgOrder = await prisma.manufacturingOrder.create({
          data: {
            orderId: id,
            productId: item.productId,
            quantityToMake: totalUnits,
            status: 'in_progress',
          },
        });

        // Generate material requirements from product elements
        if (item.product?.productElements) {
          for (const pe of item.product.productElements) {
            const quantityNeeded = pe.quantityNeeded * totalUnits;
            const totalWeightGrams = Number(pe.element?.weightGrams ?? 0) * quantityNeeded;

            await prisma.materialRequirement.upsert({
              where: {
                manufacturingOrderId_elementId_colorId: {
                  manufacturingOrderId: mfgOrder.id,
                  elementId: pe.elementId,
                  colorId: pe.colorId,
                },
              },
              create: {
                manufacturingOrderId: mfgOrder.id,
                elementId: pe.elementId,
                colorId: pe.colorId,
                quantityNeeded,
                totalWeightGrams,
              },
              update: {
                quantityNeeded,
                totalWeightGrams,
              },
            });
          }
        }
      }
    }

    return { success: true, data: serialize(order) };
  } catch (error) {
    console.error('[IPC] orders:update failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('orders:delete', async (_event, id: string): Promise<IPCResponse<{ id: string }>> => {
  try {
    await prisma.order.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    console.error('[IPC] orders:delete failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== MANUFACTURING ORDERS ==========
ipcMain.handle('manufacturing:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const orders = await prisma.manufacturingOrder.findMany({
      include: {
        product: true,
        order: true,
        requirements: {
          include: {
            element: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: serialize(orders) };
  } catch (error) {
    console.error('[IPC] manufacturing:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('manufacturing:getById', async (_event, id: string): Promise<IPCResponse<any>> => {
  try {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            productElements: {
              include: {
                element: true,
                color: true,
              },
            },
          },
        },
        order: true,
        requirements: {
          include: {
            element: true,
            color: true,
          },
        },
      },
    });
    return { success: true, data: serialize(order) };
  } catch (error) {
    console.error('[IPC] manufacturing:getById failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('manufacturing:create', async (_event, data: CreateManufacturingOrderDTO): Promise<IPCResponse<any>> => {
  try {
    const order = await prisma.manufacturingOrder.create({
      data: {
        orderId: data.orderId,
        productId: data.productId,
        quantityToMake: data.quantityToMake,
      },
      include: {
        product: true,
        order: true,
      },
    });
    return { success: true, data: serialize(order) };
  } catch (error) {
    console.error('[IPC] manufacturing:create failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('manufacturing:update', async (_event, id: string, data: UpdateManufacturingOrderDTO): Promise<IPCResponse<any>> => {
  try {
    const order = await prisma.manufacturingOrder.update({
      where: { id },
      data: {
        status: data.status,
      },
      include: {
        product: true,
        order: true,
      },
    });
    return { success: true, data: serialize(order) };
  } catch (error) {
    console.error('[IPC] manufacturing:update failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('manufacturing:delete', async (_event, id: string): Promise<IPCResponse<{ id: string }>> => {
  try {
    await prisma.manufacturingOrder.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    console.error('[IPC] manufacturing:delete failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== MATERIAL REQUIREMENTS (Pick Lists) ==========
ipcMain.handle('requirements:getByManufacturingOrder', async (_event, manufacturingOrderId: string): Promise<IPCResponse<any[]>> => {
  try {
    const requirements = await prisma.materialRequirement.findMany({
      where: { manufacturingOrderId },
      include: {
        element: true,
        color: true,
      },
      orderBy: [
        { element: { uniqueName: 'asc' } },
        { color: { colorName: 'asc' } },
      ],
    });
    return { success: true, data: serialize(requirements) };
  } catch (error) {
    console.error('[IPC] requirements:getByManufacturingOrder failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('requirements:generate', async (_event, manufacturingOrderId: string): Promise<IPCResponse<any[]>> => {
  try {
    // Fetch manufacturing order with product details
    const mfgOrder = await prisma.manufacturingOrder.findUnique({
      where: { id: manufacturingOrderId },
      include: {
        product: {
          include: {
            productElements: {
              include: {
                element: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!mfgOrder) {
      return { success: false, error: 'Manufacturing order not found' };
    }

    // Calculate requirements for each ProductElement
    const requirementsData = mfgOrder.product.productElements.map((pe) => {
      const quantityNeeded = pe.quantityNeeded * mfgOrder.quantityToMake;
      const totalWeightGrams = Number(pe.element.weightGrams) * quantityNeeded;

      return {
        manufacturingOrderId,
        elementId: pe.elementId,
        colorId: pe.colorId,
        quantityNeeded,
        totalWeightGrams,
      };
    });

    // Upsert requirements (create or update if exists)
    const requirements = await Promise.all(
      requirementsData.map((req) =>
        prisma.materialRequirement.upsert({
          where: {
            manufacturingOrderId_elementId_colorId: {
              manufacturingOrderId: req.manufacturingOrderId,
              elementId: req.elementId,
              colorId: req.colorId,
            },
          },
          create: req,
          update: {
            quantityNeeded: req.quantityNeeded,
            totalWeightGrams: req.totalWeightGrams,
          },
          include: {
            element: true,
            color: true,
          },
        })
      )
    );

    return { success: true, data: serialize(requirements) };
  } catch (error) {
    console.error('[IPC] requirements:generate failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== PRODUCTION ==========
ipcMain.handle('production:getInProduction', async (): Promise<IPCResponse<any[]>> => {
  try {
    // Get all orders with status 'in_production'
    const orders = await prisma.order.findMany({
      where: { status: 'in_production' },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                productElements: {
                  include: {
                    element: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
        manufacturingOrders: {
          include: {
            requirements: {
              include: {
                element: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Retroactive fix: auto-generate manufacturing orders for orders that have items
    // but no manufacturing orders (created before the fix was applied)
    for (const order of orders) {
      if (order.manufacturingOrders.length === 0 && order.orderItems.length > 0) {
        console.log(`[Production] Auto-generating manufacturing orders for Order #${order.orderNumber}`);
        for (const item of order.orderItems) {
          const totalUnits = item.boxesNeeded * (item.product?.unitsPerBox ?? 1);

          const mfgOrder = await prisma.manufacturingOrder.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantityToMake: totalUnits,
              status: 'in_progress',
            },
          });

          if (item.product?.productElements) {
            for (const pe of item.product.productElements) {
              const quantityNeeded = pe.quantityNeeded * totalUnits;
              const totalWeightGrams = Number(pe.element?.weightGrams ?? 0) * quantityNeeded;

              await prisma.materialRequirement.upsert({
                where: {
                  manufacturingOrderId_elementId_colorId: {
                    manufacturingOrderId: mfgOrder.id,
                    elementId: pe.elementId,
                    colorId: pe.colorId,
                  },
                },
                create: {
                  manufacturingOrderId: mfgOrder.id,
                  elementId: pe.elementId,
                  colorId: pe.colorId,
                  quantityNeeded,
                  totalWeightGrams,
                },
                update: {
                  quantityNeeded,
                  totalWeightGrams,
                },
              });
            }
          }
        }

        // Re-fetch this order's manufacturing data after generation
        const refreshedMfgOrders = await prisma.manufacturingOrder.findMany({
          where: { orderId: order.id },
          include: {
            requirements: {
              include: { element: true, color: true },
            },
          },
        });
        // Replace in-memory data with fresh data
        (order as any).manufacturingOrders = refreshedMfgOrders;
      }
    }

    // Aggregate elements per order (group by element+color)
    const result = orders.map(order => {
      const elementMap = new Map<string, {
        elementId: string;
        colorId: string;
        elementName: string;
        colorName: string;
        material: string;
        imageUrl: string | null;
        weightPerUnit: number;
        totalNeeded: number;
        totalProduced: number;
        remaining: number;
        totalWeightGrams: number;
      }>();

      for (const mfgOrder of order.manufacturingOrders) {
        for (const req of mfgOrder.requirements) {
          const key = `${req.elementId}::${req.colorId}`;
          const existing = elementMap.get(key);
          if (existing) {
            existing.totalNeeded += req.quantityNeeded;
            existing.totalProduced += req.quantityProduced;
            existing.remaining = existing.totalNeeded - existing.totalProduced;
            existing.totalWeightGrams += Number(req.totalWeightGrams);
          } else {
            elementMap.set(key, {
              elementId: req.elementId,
              colorId: req.colorId,
              elementName: req.element?.uniqueName ?? 'Unknown',
              colorName: req.color?.colorName ?? 'Unknown',
              material: req.element?.material ?? '',
              imageUrl: req.element?.imageUrl ?? null,
              weightPerUnit: Number(req.element?.weightGrams ?? 0),
              totalNeeded: req.quantityNeeded,
              totalProduced: req.quantityProduced,
              remaining: req.quantityNeeded - req.quantityProduced,
              totalWeightGrams: Number(req.totalWeightGrams),
            });
          }
        }
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        createdAt: order.createdAt,
        notes: order.notes,
        elements: Array.from(elementMap.values()),
      };
    });

    return { success: true, data: serialize(result) };
  } catch (error) {
    console.error('[IPC] production:getInProduction failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('production:recordProduction', async (_event, data: RecordProductionDTO): Promise<IPCResponse<any>> => {
  try {
    const { orderId, elementId, colorId, amountProduced } = data;

    if (amountProduced <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    // Find all material requirements for this order+element+color
    const requirements = await prisma.materialRequirement.findMany({
      where: {
        manufacturingOrder: { orderId },
        elementId,
        colorId,
      },
    });

    if (requirements.length === 0) {
      return { success: false, error: 'No material requirements found for this element in this order' };
    }

    // Distribute the produced amount across requirements
    let remainingToDistribute = amountProduced;
    for (const req of requirements) {
      const canProduce = req.quantityNeeded - req.quantityProduced;
      if (canProduce <= 0) continue;

      const toApply = Math.min(remainingToDistribute, canProduce);
      await prisma.materialRequirement.update({
        where: { id: req.id },
        data: { quantityProduced: { increment: toApply } },
      });
      remainingToDistribute -= toApply;
      if (remainingToDistribute <= 0) break;
    }

    // Add to inventory
    await prisma.$transaction(async (tx) => {
      // Create inventory transaction record
      await tx.inventoryTransaction.create({
        data: {
          elementId,
          colorId,
          changeAmount: amountProduced,
          reason: `Production for Order`,
        },
      });

      // Update or create inventory record
      await tx.inventory.upsert({
        where: {
          elementId_colorId: { elementId, colorId },
        },
        create: {
          elementId,
          colorId,
          totalAmount: amountProduced,
        },
        update: {
          totalAmount: { increment: amountProduced },
        },
      });
    });

    // Calculate new remaining total for this element+color in this order
    const updatedReqs = await prisma.materialRequirement.findMany({
      where: {
        manufacturingOrder: { orderId },
        elementId,
        colorId,
      },
    });
    const totalNeeded = updatedReqs.reduce((sum, r) => sum + r.quantityNeeded, 0);
    const totalProduced = updatedReqs.reduce((sum, r) => sum + r.quantityProduced, 0);
    const remaining = totalNeeded - totalProduced;

    return { success: true, data: { remaining } };
  } catch (error) {
    console.error('[IPC] production:recordProduction failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== ASSEMBLY ==========
ipcMain.handle('assembly:getOrders', async (): Promise<IPCResponse<any[]>> => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'in_production' },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientName: order.clientName,
      createdAt: order.createdAt,
      notes: order.notes,
      products: order.orderItems.map(item => ({
        orderItemId: item.id,
        productId: item.productId,
        serialNumber: item.product?.serialNumber ?? 'Unknown',
        imageUrl: item.product?.imageUrl ?? null,
        category: item.product?.category ?? '',
        boxesNeeded: item.boxesNeeded,
        boxesAssembled: item.boxesAssembled,
        remaining: item.boxesNeeded - item.boxesAssembled,
        unitsPerBox: item.product?.unitsPerBox ?? 1,
      })),
    }))
    // Filter out orders where ALL products are fully assembled
    .filter(order => order.products.some(p => p.remaining > 0));

    return { success: true, data: serialize(result) };
  } catch (error) {
    console.error('[IPC] assembly:getOrders failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('assembly:record', async (_event, data: { orderId: string; productId: string; boxesAssembled: number }): Promise<IPCResponse<any>> => {
  try {
    const { orderId, productId, boxesAssembled } = data;

    if (boxesAssembled <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    // Find the order item
    const orderItem = await prisma.orderItem.findFirst({
      where: { orderId, productId },
    });

    if (!orderItem) {
      return { success: false, error: 'Order item not found' };
    }

    const newTotal = orderItem.boxesAssembled + boxesAssembled;
    if (newTotal > orderItem.boxesNeeded) {
      return { success: false, error: `Cannot exceed needed boxes. Max remaining: ${orderItem.boxesNeeded - orderItem.boxesAssembled}` };
    }

    // Get the product with its elements to know what to deduct from inventory
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productElements: true,
      },
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Calculate total units assembled: boxes × unitsPerBox
    const totalUnitsAssembled = boxesAssembled * (product.unitsPerBox ?? 1);

    // ── INVENTORY GUARD: check all elements have enough stock BEFORE transaction ──
    const insufficientElements: { elementName: string; colorName: string; required: number; available: number }[] = [];
    for (const pe of product.productElements) {
      const deductAmount = pe.quantityNeeded * totalUnitsAssembled;
      const inventoryRecord = await prisma.inventory.findUnique({
        where: {
          elementId_colorId: { elementId: pe.elementId, colorId: pe.colorId },
        },
        include: { element: true, color: true },
      });
      const available = inventoryRecord?.totalAmount ?? 0;
      if (available < deductAmount) {
        insufficientElements.push({
          elementName: inventoryRecord?.element?.uniqueName ?? pe.elementId,
          colorName: inventoryRecord?.color?.colorName ?? pe.colorId,
          required: deductAmount,
          available,
        });
      }
    }

    if (insufficientElements.length > 0) {
      const details = insufficientElements
        .map(e => `${e.elementName} (${e.colorName}): need ${e.required}, have ${e.available}`)
        .join('\n');
      return {
        success: false,
        error: `Insufficient inventory to assemble ${boxesAssembled} box(es):\n${details}`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // Update boxes assembled on the order item
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { boxesAssembled: newTotal },
      });

      // Add to product stock
      await tx.productStock.upsert({
        where: { productId },
        create: {
          productId,
          stockBoxedAmount: boxesAssembled,
        },
        update: {
          stockBoxedAmount: { increment: boxesAssembled },
        },
      });

      // Deduct elements from inventory for each product element
      for (const pe of product.productElements) {
        const deductAmount = pe.quantityNeeded * totalUnitsAssembled;

        // Deduct from inventory (guaranteed to exist and have enough from guard above)
        await tx.inventory.update({
          where: {
            elementId_colorId: { elementId: pe.elementId, colorId: pe.colorId },
          },
          data: {
            totalAmount: { decrement: deductAmount },
          },
        });

        // Record inventory transaction (negative = deduction)
        await tx.inventoryTransaction.create({
          data: {
            elementId: pe.elementId,
            colorId: pe.colorId,
            changeAmount: -deductAmount,
            reason: `Assembly: ${boxesAssembled} box(es) of ${product.serialNumber}`,
          },
        });
      }
    });

    return {
      success: true,
      data: {
        boxesAssembled: newTotal,
        remaining: orderItem.boxesNeeded - newTotal,
      },
    };
  } catch (error) {
    console.error('[IPC] assembly:record failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== STOCK ORDERS ==========
ipcMain.handle('stock:getOrders', async (): Promise<IPCResponse<any[]>> => {
  try {
    // Get all orders that are in_production or shipped
    const orders = await prisma.order.findMany({
      where: { status: { in: ['in_production', 'shipped'] } },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientName: order.clientName,
      createdAt: order.createdAt,
      status: order.status,
      products: order.orderItems.map(item => ({
        productId: item.productId,
        serialNumber: item.product?.serialNumber ?? 'Unknown',
        imageUrl: item.product?.imageUrl ?? null,
        category: item.product?.category ?? '',
        boxesNeeded: item.boxesNeeded,
        boxesReady: item.boxesAssembled,
        unitsPerBox: item.product?.unitsPerBox ?? 1,
      })),
    }));

    return { success: true, data: serialize(result) };
  } catch (error) {
    console.error('[IPC] stock:getOrders failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== INVENTORY ==========
ipcMain.handle('inventory:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        element: true,
        color: true,
      },
      orderBy: [
        { element: { uniqueName: 'asc' } },
        { color: { colorName: 'asc' } },
      ],
    });
    return { success: true, data: serialize(inventory) };
  } catch (error) {
    console.error('[IPC] inventory:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('inventory:getByElement', async (_event, elementId: string, colorId: string): Promise<IPCResponse<any>> => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: {
        elementId_colorId: {
          elementId,
          colorId,
        },
      },
      include: {
        element: true,
        color: true,
      },
    });
    return { success: true, data: serialize(inventory) };
  } catch (error) {
    console.error('[IPC] inventory:getByElement failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('inventory:adjust', async (_event, data: CreateInventoryTransactionDTO): Promise<IPCResponse<any>> => {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          elementId: data.elementId,
          colorId: data.colorId,
          changeAmount: data.changeAmount,
          reason: data.reason,
        },
      });

      // Update or create inventory record
      const inventory = await tx.inventory.upsert({
        where: {
          elementId_colorId: {
            elementId: data.elementId,
            colorId: data.colorId,
          },
        },
        create: {
          elementId: data.elementId,
          colorId: data.colorId,
          totalAmount: data.changeAmount,
        },
        update: {
          totalAmount: {
            increment: data.changeAmount,
          },
        },
        include: {
          element: true,
          color: true,
        },
      });

      return inventory;
    });

    return { success: true, data: serialize(result) };
  } catch (error) {
    console.error('[IPC] inventory:adjust failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('inventory:getTransactions', async (): Promise<IPCResponse<any[]>> => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        element: true,
        color: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to most recent 100 transactions
    });
    return { success: true, data: serialize(transactions) };
  } catch (error) {
    console.error('[IPC] inventory:getTransactions failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== PRODUCTS ==========
ipcMain.handle('products:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const products = await prisma.product.findMany({
      include: {
        productElements: {
          include: {
            element: true,
            color: true,
          },
        },
        productStock: true,
      },
      orderBy: { serialNumber: 'asc' },
    });
    return { success: true, data: serialize(products) };
  } catch (error) {
    console.error('[IPC] products:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('products:getById', async (_event, id: string): Promise<IPCResponse<any>> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productElements: {
          include: {
            element: true,
            color: true,
          },
        },
        productStock: true,
      },
    });
    return { success: true, data: serialize(product) };
  } catch (error) {
    console.error('[IPC] products:getById failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('products:create', async (_event, data: CreateProductDTO): Promise<IPCResponse<any>> => {
  try {
    const product = await prisma.product.create({
      data: {
        serialNumber: data.serialNumber,
        category: data.category,
        unitsPerAssembly: data.unitsPerAssembly ?? 1,
        unitsPerBox: data.unitsPerBox,
        imageUrl: data.imageUrl,
      },
    });
    return { success: true, data: product };
  } catch (error) {
    console.error('[IPC] products:create failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('products:addElement', async (_event, data: { productId: string; elementId: string; colorId: string; quantityNeeded: number }): Promise<IPCResponse<any>> => {
  try {
    const pe = await prisma.productElement.create({
      data: {
        productId: data.productId,
        elementId: data.elementId,
        colorId: data.colorId,
        quantityNeeded: data.quantityNeeded,
      },
      include: {
        element: true,
        color: true,
      },
    });
    return { success: true, data: serialize(pe) };
  } catch (error) {
    console.error('[IPC] products:addElement failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('products:delete', async (_event, id: string): Promise<IPCResponse<{ id: string }>> => {
  try {
    await prisma.$transaction(async (tx) => {
      // Delete material requirements linked to manufacturing orders for this product
      await tx.materialRequirement.deleteMany({
        where: { manufacturingOrder: { productId: id } },
      });
      // Delete manufacturing orders for this product
      await tx.manufacturingOrder.deleteMany({ where: { productId: id } });
      // Delete order items referencing this product
      await tx.orderItem.deleteMany({ where: { productId: id } });
      // Delete product stock
      await tx.productStock.deleteMany({ where: { productId: id } });
      // Delete product (productElements cascade via schema)
      await tx.product.delete({ where: { id } });
    });
    return { success: true, data: { id } };
  } catch (error) {
    console.error('[IPC] products:delete failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== PRODUCT STOCK ==========
ipcMain.handle('productStock:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const stock = await prisma.productStock.findMany({
      include: {
        product: true,
      },
      orderBy: {
        product: {
          serialNumber: 'asc',
        },
      },
    });
    return { success: true, data: stock };
  } catch (error) {
    console.error('[IPC] productStock:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('productStock:getById', async (_event, productId: string): Promise<IPCResponse<any>> => {
  try {
    const stock = await prisma.productStock.findUnique({
      where: { productId },
      include: {
        product: true,
      },
    });
    return { success: true, data: stock };
  } catch (error) {
    console.error('[IPC] productStock:getById failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== COLORS ==========
ipcMain.handle('colors:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const colors = await prisma.color.findMany({
      orderBy: { colorName: 'asc' },
    });
    return { success: true, data: colors };
  } catch (error) {
    console.error('[IPC] colors:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('colors:create', async (_event, data: CreateColorDTO): Promise<IPCResponse<any>> => {
  try {
    const color = await prisma.color.create({
      data: {
        colorName: data.colorName,
      },
    });
    return { success: true, data: color };
  } catch (error) {
    console.error('[IPC] colors:create failed:', error);
    return { success: false, error: String(error) };
  }
});

// ========== ELEMENTS ==========
ipcMain.handle('elements:getAll', async (): Promise<IPCResponse<any[]>> => {
  try {
    const elements = await prisma.element.findMany({
      orderBy: { uniqueName: 'asc' },
    });
    return { success: true, data: serialize(elements) };
  } catch (error) {
    console.error('[IPC] elements:getAll failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('elements:create', async (_event, data: CreateElementDTO): Promise<IPCResponse<any>> => {
  try {
    const element = await prisma.element.create({
      data: {
        uniqueName: data.uniqueName,
        material: data.material,
        weightGrams: data.weightGrams,
        imageUrl: data.imageUrl,
      },
    });
    return { success: true, data: serialize(element) };
  } catch (error) {
    console.error('[IPC] elements:create failed:', error);
    return { success: false, error: String(error) };
  }
});
