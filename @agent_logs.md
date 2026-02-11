# Agent Implementation Log — Stock Tab Manual Control (Phase 15)

## Release: v0.2.7.1 — 2026-02-11
- **Action**: Bumped application version to `v0.2.7.1` and updated logs.
- **Commit**: chore(release): bump version to v0.2.7.1 and update logs
- **Tag**: v0.2.7.1 (pushed)

**Date Started**: 2026-02-10  
**Purpose**: Major architectural change to stock management - removing auto-deduction and implementing manual user control

---

## ⚠️ KEY CHANGE: Stock Management Philosophy

### Before (Automatic)
- `assembly.record()` for orders would add boxes to BOTH `orderItem.boxesAssembled` AND `productStock.stockBoxedAmount` (double-counting)
- `autoDeductProductStock()` would automatically consume excess stock when orders entered 'in_production' state  
- `deductProductStockOnShip()` would attempt cleanup on shipping but the math was corrupted
- Result: ProductStock was a confusing running total, not true excess stock

### After (Manual)
- `assembly.record()` for orders ONLY touches `orderItem.boxesAssembled` (no ProductStock interaction)
- `ProductStock` represents exclusively true excess stock from `recordExcessAssembly()`
- No auto-deduction — user manually applies excess stock to orders via Stock tab UI
- Clean data model: OrderItem = order progress, ProductStock = genuine excess inventory

---

## 🎯 Phase 15 Implementation Summary

### Backend Changes (NestJS API)

1. **`apps/api/src/assembly/assembly.service.ts`**
   ```diff
   -  await tx.productStock.upsert({
   -    where: { productId },
   -    create: { productId, stockBoxedAmount: boxesAssembled },
   -    update: { stockBoxedAmount: { increment: boxesAssembled } },
   -  });
   +  // NOTE: Do NOT update productStock here — order-bound assembly should only
   +  // touch orderItem.boxesAssembled. ProductStock is exclusively for true excess
   ```

2. **`apps/api/src/orders/orders.service.ts`**
   - Removed `autoDeductProductStock()` method (28 lines removed)
   - Removed `deductProductStockOnShip()` method (22 lines removed)  
   - Removed calls to both methods in `create()` and `update()`
   - Added comments explaining the new manual-only approach

3. **`apps/api/src/stock/stock.service.ts`**
   - Added `applyStockToOrder()` method (55 lines)
   - Validates order exists & in_production, orderItem exists, stock available
   - Atomic transaction: decrements ProductStock, increments orderItem.boxesAssembled
   - Returns detailed response with new values

4. **`apps/api/src/stock/stock.controller.ts`**
   - Added `POST /stock/apply-to-order` endpoint
   - Body: `{ orderId: string, productId: string, boxes: number }`

### Frontend Changes (React/Next.js)

5. **`components/features/stock-tab.tsx`**
   - Complete rewrite of StockOrderCard with inline apply-from-stock controls
   - Added stockMap for O(1) excess stock lookup per product
   - New "Apply from stock" button appears when: availableStock > 0 AND remaining > 0
   - Inline input form with validation, pre-filled with min(available, remaining)
   - Real-time refresh of both stock orders and excess stock after application
   - Converted functions to useCallback for performance

6. **`lib/api-client.ts`**
   - Added `applyStockToOrder()` function: `post('/stock/apply-to-order', data)`

7. **`lib/api-bridge.ts`** 
   - Added `applyStockToOrder` to the API bridge mapping

8. **`types/ipc.ts`**
   - Added `applyStockToOrder` method to ElectronAPI interface
   - Response type: `{ orderId, productId, boxesApplied, newBoxesAssembled, newStockAmount }`

### Localization (i18n)

9. **`lib/i18n.tsx`** (All 3 languages: English, Albanian, Macedonian)
   - `stock.excessSubtitleManual`: "apply manually to orders via buttons" (replaces auto-applied text)
   - `stock.applyFromStock`: "Apply from stock"
   - `stock.available`: "available"  
   - `stock.apply`: "Apply"
   - `stock.applyFailed`: "Failed to apply stock to order"

---

## 🔧 Technical Implementation Details

### Data Flow (New Manual Process)
1. User assembles excess boxes via Inventory tab → `recordExcessAssembly()` → ProductStock++
2. User creates/starts order → No auto-deduction, boxesAssembled = 0
3. User goes to Stock tab, sees order products with "Apply from stock" buttons (if excess exists)
4. User clicks button, input form appears pre-filled with optimal amount
5. User confirms → `POST /stock/apply-to-order` → ProductStock--, orderItem.boxesAssembled++
6. Both lists refresh, stock button disappears if no more stock/remaining

### UI/UX Enhancements
- **Smart defaults**: Apply input pre-fills with `Math.min(availableStock, remainingNeeded)`
- **Visual feedback**: Amber-themed excess stock display, progress bars, stock badges
- **Validation**: Frontend prevents > remaining, backend prevents stock oversell
- **Error handling**: User-friendly alerts for API failures
- **Modal-free**: Inline expand/collapse design, no popups

### Database Integrity
- **ProductStock**: Now represents only genuine excess (from recordExcessAssembly)
- **OrderItem.boxesAssembled**: Mixed source (manual assembly + applied stock)
- **Atomic operations**: Stock applications use Prisma transactions
- **Referential integrity**: All foreign keys maintained, no orphaned data

---

## ✅ Testing & Verification

### Build Status
- **Next.js build**: ✅ Compiled successfully in 2.2s
- **NestJS API build**: ✅ TypeScript compilation clean  
- **Electron build**: ✅ Preload/main compiled successfully
- **Overall**: `npm run build:production` passes

### Manual Testing Required
1. Create excess stock via Inventory → recordExcessAssembly 
2. Create order, set to in_production → verify no auto-deduction
3. Stock tab → verify excess stock shows, apply buttons appear
4. Apply stock to order → verify ProductStock--, orderItem++
5. Ship order → verify no stock corruption
6. Repeat cycle → verify clean separation of excess vs order-bound assembly

---

## 📈 Performance & Scale Impact

### Improved
- **Database queries**: Eliminated redundant stock lookups during auto-deduction
- **User control**: No more surprise stock changes during order creation
- **Data clarity**: ProductStock now has single purpose (excess only)
- **React performance**: useCallback on refresh functions, existing memo optimizations preserved

### No Change  
- **Build size**: No new major dependencies introduced
- **Runtime performance**: HTTP latency unchanged, same local NestJS server
- **Memory usage**: Similar component tree structure

---

## 🔄 Phase Progress

- **Phase 13**: ✅ Previous gitignore fixes 
- **Phase 14**: ✅ Performance hardening, debounce, guards, internationalization
- **Phase 15**: ✅ **CURRENT** - Stock manual control implementation
- **Phase 16**: 🔮 Future - TBD based on user testing feedback

---

## 🗂️ Files Modified (Phase 15)

### Backend API
- `apps/api/src/assembly/assembly.service.ts` — Removed ProductStock update from record()
- `apps/api/src/orders/orders.service.ts` — Removed auto-deduction methods & calls  
- `apps/api/src/stock/stock.service.ts` — Added manual applyStockToOrder()
- `apps/api/src/stock/stock.controller.ts` — Added POST apply-to-order endpoint

### Frontend 
- `components/features/stock-tab.tsx` — Complete manual UI rewrite
- `lib/api-client.ts` — Added applyStockToOrder API call
- `lib/api-bridge.ts` — Added bridge mapping
- `types/ipc.ts` — Added interface method

### Configuration
- `lib/i18n.tsx` — Added 5 new translation keys × 3 languages = 15 entries

**Total**: 8 files modified, ~200 lines changed, 0 files added/deleted

**Status**: Build verified ✅, Ready for user testing

---

# Previous Implementation Log (Phases 1-14) — Preserved for History

---

## ⚠️ CRITICAL RULES (Inherited + New)

### DO NOT DELETE `dist/` FOLDER
- Contains built installers and production artifacts (SIGNED, VERSIONED, IRREPLACEABLE)

### Code Quality Standards
- **Max File Size**: No file > 1,000 lines  
- **Segmentation**: Every class, interface, enum in its own file  
- **Reusability**: Common logic in `packages/shared` or NestJS common module  
- **Pattern**: NestJS Module → Controller → Service strictly  

---

## 📋 Refactor Overview

### Before (Monolithic)
```
productionapp/
├── main/index.ts          ← 2038 lines, ALL business logic + IPC handlers
├── main/preload.ts        ← contextBridge exposing ~40 IPC methods
├── app/page.tsx           ← 134KB monolithic UI
├── types/ipc.ts           ← ElectronAPI interface with 40+ methods
├── prisma/schema.prisma   ← 15 models, SQLite
└── components/*.tsx       ← Various UI components
```

---

## 🔖 Release: v0.2.6 (2026-02-11)

**Summary:** Built and packaged Release `v0.2.6`. Updated distribution artifacts and removed older installer executables for previous patch versions.

- `package.json` and `apps/api/package.json` version fields were bumped to `0.2.6` (version-only changes).
- Generated Windows installer: `dist/installer/Production Management-Setup-0.2.6.exe`
- Generated blockmap: `dist/installer/Production Management-Setup-0.2.6.exe.blockmap`
- Updated release metadata: `dist/installer/latest.yml` now references `version: 0.2.6` and the new installer filename.
- Removed prior installer `.exe` and `.exe.blockmap` files for versions 0.2.3, 0.2.4 and 0.2.5 from `dist/installer/` per request (kept folder and other artifacts intact).

**Notes:**
- Only distribution files and the agent log were modified in this step; no application source code logic was changed beyond the earlier, authorized version bump.
- Build and packaging were executed locally; artifacts are available under `dist/installer/`.


**Architecture**: Renderer → IPC (contextBridge) → Electron Main → Prisma → SQLite

### After (Client-Server)
```
productionapp/
├── apps/
│   ├── web/               ← Next.js UI (static export)
│   └── api/               ← NestJS REST server (local)
│       ├── src/
│       │   ├── auth/
│       │   ├── orders/
│       │   ├── products/
│       │   ├── elements/
│       │   ├── inventory/
│       │   ├── manufacturing/
│       │   ├── assembly/
│       │   ├── stock/
│       │   ├── raw-materials/
│       │   └── common/
│       └── prisma/
├── packages/
│   └── shared/            ← DTOs, response types, interfaces
├── electron/
│   ├── main/
│   │   ├── index.ts       ← Lifecycle only
│   │   └── server-manager.ts ← Spawns NestJS
│   └── preload/
│       └── index.ts       ← Exposes API_PORT only
└── electron-builder.json5
```

**Architecture**: Renderer → HTTP (fetch/axios) → NestJS → Prisma → SQLite

---

## 📦 New Dependencies

### apps/api
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
- `@prisma/client`, `prisma`
- `class-validator`, `class-transformer`
- `@nestjs/swagger` (optional, API docs)

### Root (Electron)
- `get-port` (dynamic port allocation)

### packages/shared
- Standalone TypeScript package (no runtime deps)

---

## 📝 Changelog

### 2026-02-10 — Phase 0: Setup & Log File Rotation
- Created `agent_logs_refactor.md` (this file)
- Old `@agent_logs.md` preserved for history reference
- Deleted extraneous .md files from root

### 2026-02-10 — Phase 1: Scaffolding & Workspace Setup
- Created `apps/api/` NestJS project structure with 10 domain modules:
  - `auth`, `elements`, `products`, `orders`, `inventory`, `manufacturing`, `production`, `assembly`, `stock`, `raw-materials`
- Created `packages/shared/` with DTOs (`product.dto.ts`, `order.dto.ts`, `raw-material.dto.ts`)
- Created `electron/main/index.ts` (196 lines) — Lifecycle, IPC, auto-updater
- Created `electron/main/server-manager.ts` (115 lines) — Forks NestJS as child process
- Created `electron/preload/index.ts` — Minimal preload exposing `getApiPort`, `getAppVersion`, `selectImage`, `onUpdateStatus`
- Created `lib/api-client.ts` (252 lines) — HTTP fetch client replacing old IPC calls
- Created `lib/api-bridge.ts` — Compatibility bridge mapping `window.electron.*()` to HTTP API calls
- Created `components/api-bridge-provider.tsx` — React wrapper initializing bridge on mount
- Updated `app/layout.tsx` — Wraps app in `ApiBridgeProvider` + `AuthGate`
- Created `apps/api/src/common/all-exceptions.filter.ts` — Global exception filter
- Created `apps/api/src/common/serialize.util.ts` — BigInt/Date serialization
- Version bumped to **v0.2.2** (root + apps/api `package.json`)

### 2026-02-10 — Phase 2: Dependency Installation & Build Pipeline
- Installed root-level NestJS dependencies:
  - `reflect-metadata`, `@nestjs/common@^11`, `@nestjs/core@^11`, `@nestjs/platform-express@^11`, `rxjs@^7.8.1`
- Build pipeline (`npm run build:production`):
  1. `generate-icons` → PNG to ICO/ICNS
  2. `next build` → Static export to `out/`
  3. `tsc -p apps/api/tsconfig.json` → Compiles to `dist/api/`
  4. `tsc -p electron/tsconfig.json` → Compiles to `dist/electron/`

### 2026-02-10 — Phase 3: Bug Fixes (7 bugs found, all fixed)

#### Bug 1: `electron-is-dev` ESM incompatibility (ROOT CAUSE OF CRASH LOOP)
- **Problem**: `electron-is-dev` v3.x is ESM-only (`"type": "module"`) but Electron compiles to CommonJS. `require('electron-is-dev')` throws `ERR_REQUIRE_ESM` immediately on startup, crashing the main process before anything runs.
- **Fix**: Removed `import isDev from 'electron-is-dev'`, replaced with `const isDev = !app.isPackaged;`
- **File**: `electron/main/index.ts` line 9

#### Bug 2: Database path mismatch in PrismaService
- **Problem**: `ServerManager` sets `DATABASE_PATH` env var, but `PrismaService.resolveDbPath()` only checked `DATABASE_URL`, never finding the DB.
- **Fix**: Updated `resolveDbPath()` to check `DATABASE_PATH` first, then `DATABASE_URL`, then `cwd/dev.db`.
- **File**: `apps/api/src/prisma-db/prisma.service.ts`

#### Bug 3: `product.dto.ts` broken import
- **Problem**: `import { RawMaterialResponse } from './raw-material.dto'` failed with `Cannot find module` (TypeScript path resolution issue in shared package).
- **Fix**: Replaced with inline `RawMaterialResponseRef` interface.
- **File**: `packages/shared/src/dto/product.dto.ts`

#### Bug 4: API route mismatches (3 routes)
- **Problem**: `api-client.ts` routes didn't match NestJS controller decorators.
- **Fixes**:
  - `addProductElement`: `POST /products/elements` → `POST /products/add-element`
  - `removeProductElement`: `DELETE /products/elements/:id` → `DELETE /products/remove-element/:id`
  - `generateMaterialRequirements`: `POST /manufacturing/generate/:id` → `POST /manufacturing/:id/generate-requirements`
- **File**: `lib/api-client.ts`

#### Bug 5: Missing bridge methods (6 methods)
- **Problem**: `api-bridge.ts` was missing methods the UI calls, causing `undefined is not a function` errors.
- **Fix**: Added `getInventoryByElement`, `adjustInventory`, `getInventoryTransactions`, `getProductStock`, `getProductStockById`, `getRawMaterialTransactions`.
- **File**: `lib/api-bridge.ts`

#### Bug 6: ProductsService update() passing undefined fields
- **Problem**: `ProductsService.update()` passed all DTO fields to Prisma, including `undefined` ones, causing Prisma errors.
- **Fix**: Filters undefined fields before passing to `prisma.product.update()`.
- **File**: `apps/api/src/products/products.service.ts`

#### Bug 7: ServerManager NODE_ENV not set correctly
- **Problem**: `ServerManager` used hardcoded `'production'` for NODE_ENV regardless of environment.
- **Fix**: Uses `!require('electron').app.isPackaged` to set correct NODE_ENV.
- **File**: `electron/main/server-manager.ts`

### 2026-02-10 — Phase 4: Preload & URL Loading Fixes (CRASH LOOP RESOLVED)

#### Bug 8: Preload script path wrong
- **Problem**: BrowserWindow config had `preload: path.join(__dirname, 'preload.js')` which resolves to `dist/electron/main/preload.js`. But `electron/preload/index.ts` compiles to `dist/electron/preload/index.js` (mirrors source directory structure). Without preload, `window.electronAPI` was `undefined`, breaking the entire renderer.
- **Fix**: Changed to `path.join(__dirname, '..', 'preload', 'index.js')`.
- **File**: `electron/main/index.ts` line 38

#### Bug 9: Dev mode always tried localhost:3000
- **Problem**: Running `npm run electron` (unpackaged) set `isDev = true` and loaded `http://localhost:3000`, but no Next.js dev server was running. The static build in `out/` existed but was ignored.
- **Fix**: Added `hasStaticBuild = fs.existsSync(path.join(appRoot, 'out', 'index.html'))` and `useDevServer = isDev && !hasStaticBuild`. Now uses `app://` protocol when static build exists, even when unpackaged.
- **File**: `electron/main/index.ts` lines 18-21

#### Bug 10: `app://` protocol only registered in production
- **Problem**: `protocol.registerSchemesAsPrivileged` was behind `if (!isDev)`, so when running unpackaged with a static build, the `app://` scheme wasn't available.
- **Fix**: Always register the protocol scheme (must happen before `app.whenReady()`). The `protocol.handle()` inside `whenReady()` still conditional on `!useDevServer`.
- **File**: `electron/main/index.ts` lines 57-59

### 2026-02-10 — Phase 5: Production Mode & utilityProcess Implementation (IN PROGRESS)

#### Bug 11: Production Server Spawning - Module Resolution
- **Problem**: Attempted to use `spawn(process.execPath, [serverEntry])` in production to execute JavaScript, but Electron exe is not a valid Node.js runtime. IPC communication fails with spawn, HTTP polling unreliable.
- **Root Cause**: In packaged Electron apps, `fork()` expects a separate node.exe binary and IPC channel, but packaged apps only have the Electron exe. Spawning child processes from packaged apps requires a different approach.
- **Solution Attempt 1**: Use Electron's `utilityProcess` API (`utilityProcess.fork()`) designed specifically for running Node.js code in packaged apps.
  - Replaced `fork()` with `utilityProcess.fork()` in production mode
  - Updated code to handle both `ChildProcess` (dev) and `UtilityProcess` (production) types with proper type narrowing
  - Set `NODE_PATH` env var to point to modules in unpacked directories
  - Modified CWD to app.asar root for module resolution
  - File: `electron/main/server-manager.ts` (191 lines)
- **Build Status**: ✅ Compiles successfully, v0.2.2 installer rebuilt (233+ MB)
- **Test Result**: ❌ Production app launches via `utilityProcess` — server spawns correctly and finds compiled API file at unpacked path
  - ERROR: `Cannot find module 'reflect-metadata'` at server startup
  - Root cause: node_modules are packed inside `app.asar`, but unpacked code in `app.asar.unpacked/dist/api/main.js` cannot access them even with NODE_PATH
  - MODULE RESOLUTION BLOCKER: Standard Node.js module resolution cannot bridge ASAR boundaries
- **Current Status**: 
  - ✅ `utilityProcess` API working (process spawns, stdio pipes set up, no crash)
  - ✅ Server entry point found and executable
  - ❌ Module discovery broken (NPM packages locked in ASAR, unpacked code can't access)
  - **CRITICAL BLOCKER**: Need to either:
    1. Unpack `node_modules` to `app.asar.unpacked` via electron-builder config → Large installer (500+ MB estimated)
    2. Include portable Node.js binary with app and spawn separately → Complex, requires additional download
    3. Bundle all NestJS code + deps into single executable via webpack/esbuild → Recommended, needs refactoring
- **Files Modified**:
  - `electron/main/server-manager.ts` — Added utilityProcess fork, type narrowing for event handlers, NODE_PATH env var, conditional CWD/serverEntry paths
  - `electron-builder.json` — Added `"dist/api/**/*"` and `"apps/api/**/*"` to `asarUnpack` array

---

## 🏗️ Current Architecture (Post-Refactor)

### File Structure
```
productionapp/
├── apps/
│   └── api/src/                         ← NestJS REST API
│       ├── main.ts                      ← Entry point, calls PrismaService.initializeProductionDb()
│       ├── app.module.ts                ← 10 domain modules
│       ├── prisma-db/prisma.service.ts  ← DB init + PrismaClient with better-sqlite3
│       ├── auth/                        ← AuthController + AuthService
│       ├── elements/                    ← ElementsController + ElementsService
│       ├── products/                    ← ProductsController + ProductsService
│       ├── orders/                      ← OrdersController + OrdersService
│       ├── inventory/                   ← InventoryController + InventoryService
│       ├── manufacturing/               ← ManufacturingController + ManufacturingService + helper
│       ├── production/                  ← ProductionController + ProductionService
│       ├── assembly/                    ← AssemblyController + AssemblyService
│       ├── stock/                       ← StockController + StockService
│       ├── raw-materials/               ← RawMaterialsController + RawMaterialsService
│       └── common/                      ← AllExceptionsFilter, serialize.util
├── packages/shared/src/dto/             ← Shared TypeScript DTOs
├── electron/
│   ├── main/index.ts                    ← 196 lines: lifecycle, IPC, auto-updater
│   ├── main/server-manager.ts           ← 191 lines: forks NestJS (dev) / utilityProcess (prod)
│   ├── preload/index.ts                 ← 4 methods: getApiPort, getAppVersion, selectImage, onUpdateStatus
│   └── tsconfig.json                    ← Compiles to dist/electron/
├── lib/
│   ├── api-client.ts                    ← 252 lines: HTTP fetch client
│   ├── api-bridge.ts                    ← Maps window.electron.X() → HTTP
│   └── db.ts, env.ts, utils.ts          ← Utilities
├── components/api-bridge-provider.tsx   ← Initializes bridge on mount
├── app/page.tsx                         ← 2946 lines: Main UI (all tabs)
├── out/                                 ← Next.js static export (served via app:// protocol)
└── dist/
    ├── api/main.js                      ← Compiled NestJS server
    ├── electron/main/index.js           ← Compiled Electron main
    ├── electron/main/server-manager.js  ← Compiled ServerManager
    ├── electron/preload/index.js        ← Compiled preload
    └── installer/                       ← Built installers
```

### Data Flow
```
Renderer (Next.js static)
  → window.electron.X() (api-bridge.ts compatibility layer)
    → HTTP fetch to http://127.0.0.1:{port}/api/... (api-client.ts)
      → NestJS Controller → Service → Prisma → SQLite
```

### Key Design Decisions
- **Preload is minimal** (4 IPC methods) — all data goes via HTTP fetch
- **API bridge** provides zero-change compatibility with old `window.electron` interface
- **ServerManager** finds free port starting at 4123, passes `DATABASE_PATH` env var
- **PrismaService** has raw SQL schema init for production (13 tables, schema v3)
- **`app://` protocol** always registered, not just in production
- **`useDevServer`** = `isDev && !hasStaticBuild` — smart fallback logic
- **Production Spawning**: Dev uses `fork()`, Production uses `utilityProcess.fork()`

### Known Remaining Issues
- **Zod version conflict**: `dependencies` has `zod@^3.24.1`, `devDependencies` has `zod@^4.3.6` (not crash-causing)
- **`app/page.tsx` is 2946 lines** — should be split into feature components (future task)
- **CRITICAL BLOCKER**: Production module resolution — node_modules in ASAR unreachable from unpacked code

---

## 🔑 Critical Paths for Future Agents

| Operation | Command | Notes |
|-----------|---------|-------|
| Full build | `npm run build:production` | Icons + Next.js + API tsc + Electron tsc |
| Run app (with static build) | `npx electron .` | Uses `out/` via `app://` protocol |
| Run app (dev mode) | `npm run electron:dev` | Starts Next.js dev + API watch + Electron |
| Build installer | `npm run electron:build:win` | Creates Setup exe in `dist/installer/` |
| NestJS entry | `dist/api/main.js` | Forked by ServerManager (dev) or utilityProcess (prod) |
| Preload entry | `dist/electron/preload/index.js` | NOT `dist/electron/main/preload.js` |
| DB path (dev) | `{projectRoot}/dev.db` | Set by Electron main |
| DB path (prod) | `{userData}/production.db` | Set by Electron main |

---

## ✅ RESOLVED — Bug #11: Production Module Resolution

- **Status**: FIXED on 2026-02-10
- **Root Cause**: `dist/api/**/*` was in `asarUnpack`, which placed the NestJS entry point at `app.asar.unpacked/dist/api/main.js`. When that code ran `require('reflect-metadata')`, Node.js module resolution started from the unpacked directory and could NOT find `node_modules/` which was inside `app.asar`. Module resolution cannot cross from unpacked → ASAR boundaries.
- **Fix Applied (2 files)**:
  1. **`electron-builder.json`**: Removed `"dist/api/**/*"` and `"apps/api/**/*"` from `asarUnpack`. Only native .node binaries (`better-sqlite3`) remain unpacked. The compiled API stays INSIDE the ASAR archive.
  2. **`electron/main/server-manager.ts`**: Simplified to use `path.join(__dirname, '..', '..', 'api', 'main.js')` for BOTH dev and prod — this resolves to an ASAR-internal path in production. Removed the `asarUnpackedDir` logic, removed `NODE_PATH` hack. CWD set to `app.getPath('userData')` in production (writable dir).
- **Why it works**: Electron's `utilityProcess.fork()` has full ASAR transparency. It can load JS files from inside `.asar` archives and `require()` calls work normally because entry point + node_modules are in the same ASAR, so standard Node.js module resolution resolves everything.
- **Verified**: Production exe launches, NestJS starts on port 4123, all 12 modules load, Prisma connects to SQLite, API returns HTTP 200 with real data.

---

## 🔧 Phase 5: Global UI Refactor — Monolith Split

**Date**: 2026-02-10

### Summary
Split the 2946-line monolithic `app/page.tsx` into 7 self-contained feature-tab components + a thin 105-line orchestrator shell. This was the remaining work from the Phase 5 task list (Tasks 1-3 were correctly skipped as already resolved).

### What Changed

| File | Lines | Purpose |
|------|-------|---------|
| `app/page.tsx` | 105 | Thin shell: layout, header, nav tabs, tab routing |
| `components/features/products-tab.tsx` | ~260 | Products CRUD, categories, filtering, edit/clone modals |
| `components/features/elements-tab.tsx` | ~400 | Elements CRUD, inline editing, color handling |
| `components/features/orders-tab.tsx` | ~200 | Orders CRUD, status filtering |
| `components/features/production-tab.tsx` | ~300 | Production recording, pivot-table print, aggregated totals |
| `components/features/inventory-tab.tsx` | ~280 | Element inventory + assembly orders (2-panel) |
| `components/features/storage-tab.tsx` | ~300 | Raw materials CRUD, stock adjustments |
| `components/features/stock-tab.tsx` | ~120 | Stock/shipping order cards |

### Design Decisions
- **Feature boundaries drive file splits** — each tab owns its state, effects, and handlers
- **Tab unmount/remount on switch** — data reloads on each tab visit (acceptable: local SQLite is fast, keeps data fresh)
- **Private components co-located** — small modals/cards that serve only one tab live inside that tab file
- **Shared components unchanged** — `OrderCard`, `ProductCard`, `CreateOrderModal` etc. remain in `components/`

### Cleanup
- Deleted `apps/web/` directory (byte-for-byte duplicate of old `app/page.tsx`)
- Deleted `app/page.tsx.bak` (backup of 2946-line original)

### Skipped Tasks (Already Resolved)
- **Task 1 (Schema UUID)**: All models already use `String @id @default(cuid())` — no changes needed
- **Task 2 (NestJS Webpack)**: Production ASAR bundling already fixed in Bug #11 — no changes needed
- **Task 3 (Server-manager)**: Already simplified in Bug #11 fix — no changes needed

### Build Verification
- ✅ `npx next build` — Compiled successfully
- ✅ `npm run build:production` — Full pipeline (Icons + Next.js + API tsc + Electron tsc) passes

---

## 🔧 Phase 6: Production Crash Fix & Installer Cleanup

**Date**: 2026-02-10

### Problem Statement
After fresh install on clean device, app v0.2.2 would launch but immediately close without showing any window. No error dialogs, just silent exit.

### Root Cause Investigation
**Critical Bug**: In production, the NestJS server spawned via `utilityProcess.fork()` attempted to notify the parent Electron process via `process.send({ type: 'ready', port })`. However, **`process.send()` does NOT exist in `utilityProcess` contexts** — that API is only available when spawned via `child_process.fork()`. 

Since the "ready" IPC message was never sent, `ServerManager.start()` hit its 30-second timeout, threw an error, and triggered `app.quit()` in the catch block. The window never got a chance to be created.

**Why it worked in dev**: Dev mode used `child_process.fork()` (system Node.js with standard IPC), where `process.send()` works fine.

### Fixes Applied (3 changes)

#### Fix 1: API Server IPC Compatibility [apps/api/src/main.ts]
**Changed**: Conditional IPC messaging for both `utilityProcess` (production) and `child_process` (dev)

**Impact**: Production now properly signals readiness via `process.parentPort.postMessage()`.

#### Fix 2: HTTP Polling Fallback [electron/main/server-manager.ts]
**Added**: Secondary readiness detection mechanism as safety net
- Primary: Listen for "ready" IPC message (as before)
- Fallback: Poll `http://127.0.0.1:{port}/api` every 500ms
- Any successful HTTP response (even 404) indicates NestJS is listening

**Why**: If IPC fails for any reason (future edge cases), the HTTP polling ensures the server manager detects readiness and prevents the 30-second timeout.

#### Fix 3: Installer Cleanup
**Removed stale artifacts**:
- `dist/installer/Production Management-Setup-0.2.1.exe` + blockmap
- `dist/installer/Production Management-Setup-0.2.2.exe` + blockmap
- `dist/installer/latest.yml` (outdated auto-updater manifest)
- `dist/main/` directory (remnant of old monolithic Electron main)
- `dist/types/` directory (stale type definitions)
- `dist/app-log.txt`, `dist/stderr.txt`, `dist/stdout.txt` (build artifacts)
- `dist/installer/.cache/`, `builder-debug.yml`, `builder-effective-config.yaml` (build metadata)

**Why**: Old installers were taking up space and could cause confusion. The monolithic `dist/main/` was completely superseded by `dist/electron/main/` (new client-server architecture).

### Version Bump
- Root `package.json` → v0.2.3
- `apps/api/package.json` → v0.2.3

### Rebuild & Verification

#### Build Process
✅ Icons generated (256/64/48/32/16x PNG→ICO)
✅ Next.js compiled (static export to out/)
✅ NestJS compiled (apps/api/src → dist/api/)
✅ Electron compiled (electron/main, electron/preload → dist/electron/)
✅ All binaries signed with code-signing.pfx
✅ NSIS installer created: Production Management-Setup-0.2.3.exe (233 MB)

#### Installation & Launch Test
1. **Uninstalled** v0.2.2 via Windows Registry uninstaller
2. **Installed** v0.2.3 from `dist/installer/Production Management-Setup-0.2.3.exe`
3. **Verified** app executable exists at `C:\Users\User\AppData\Local\Programs\Production Management\Production Management.exe`
4. **Launched** app via `Start-Process`
5. **Confirmed**:
   - ✅ Process running (PID 3380, "Production Management" window title)
   - ✅ NestJS API responding on port 4123 (HTTP 404 response confirms server listening)
   - ✅ Window visible and app did NOT crash

### Files Modified
| File | Change |
|------|--------|
| `apps/api/src/main.ts` | Added `process.parentPort.postMessage()` for utilityProcess compatibility |
| `electron/main/server-manager.ts` | Added HTTP polling fallback + improved promise resolution logic |
| `package.json` | Version: 0.2.2 → 0.2.3 |
| `apps/api/package.json` | Version: 0.2.2 → 0.2.3 |

### Cleanup Verification
```
dist/
├── api/          ← Current compiled NestJS (production-ready)
├── electron/     ← Current compiled Electron (main + preload)
└── installer/
    └── Production Management-Setup-0.2.3.exe (233 MB, signed)
    # Old installers and artifacts removed ✓
```

### Status
**✅ PHASE 6 COMPLETE** — Production crash fixed, installer cleaned, app verified launching successfully

---

## Phase 7: Assembly & Excess Features (2026-02-10)

### User Requirements
1. **Assembly Print Sheet** — Per-order guide showing product serial/image/label with unique color elements
2. **Hide Shipped Orders from Stock Tab** — Only show in_production orders in stock window
3. **Excess Assembly Notifications** — Show "X boxes can be assembled" text on order cards
4. **Excess Assembly Card** — Dedicated card to assemble excess (locked until order incomplete)
5. **Auto-Deduct Excess Stock** — When new order enters production, auto-apply existing product_stock boxes

### Features Implemented

#### 1. Assembly Print Sheet (Production Tab)
- **File**: `components/features/production-tab.tsx`
- **Function**: `handlePrintAssembly(orderId)` 
- **Behavior**: Opens A4 portrait print preview with:
  - Product serial number (large, bold)
  - Product image (64×64px)
  - Product label (purple badge)
  - Element color dots (only colors, no text — for assembly workers)
  - Dual-color elements shown with overlapping dots
- **Button**: "Assembly Sheet" icon button on each ProductionOrderCard
- **Type**: `ProductionOrderCard` component updated with `onPrintAssembly?: (orderId: string) => void` prop

#### 2. Hide Shipped Orders from Stock Tab
- **File**: `apps/api/src/stock/stock.service.ts`
- **Change**: `getOrders()` now queries `where: { status: 'in_production' }` only
- **Result**: Shipped orders completely hidden from stock window UI (still in DB for history)
- **Line Changed**: ~Line 10 in `getOrders()`

#### 3. Excess Assembly Backend Endpoints
- **File**: `apps/api/src/assembly/assembly.service.ts`
- **New Methods**:
  - `async getExcessAssembly()`: Returns products with `{ excessBoxes, locked }` field
    - `locked = true` if any active order still has `boxesAssembled < boxesNeeded`
    - Calculates per-product: can assemble X extra boxes from current inventory
  - `async recordExcessAssembly()`: Validates product NOT locked, deducts inventory, upserts product_stock
- **Validation**: Rejects excess recording if product has unfinished orders
- **Type**: `ExcessAssemblyData { productId, serialNumber, label, imageUrl, category, excessBoxes, locked }`

#### 4. Excess Assembly Controller & API Routes
- **File**: `apps/api/src/assembly/assembly.controller.ts`
- **New Routes**:
  - `GET /api/assembly/excess` → calls `getExcessAssembly()`
  - `POST /api/assembly/record-excess` → calls `recordExcessAssembly(body)`
- **Client Methods**:
  - `api-client.ts`: `getExcessAssembly()`, `recordExcessAssembly(data)`
  - `api-bridge.ts`: Maps to ElectronAPI
  - `types/ipc.ts`: Added `ExcessAssemblyData` interface + ElectronAPI methods

#### 5. Excess Assembly UI (Inventory Tab)
- **File**: `components/features/inventory-tab.tsx`
- **Components**:
  - `ExcessAssemblyCard`: Shows all available excess products with lock status
  - `ExcessProductRow`: Individual product with locked/unlocked state
- **Behavior**:
  - **Locked (60% opacity, no input)**:
    - Display: "🔒 Finish orders first (X boxes possible)"
    - Input field hidden
    - Cannot record excess
  - **Unlocked**:
    - Display: "Can assemble X boxes"
    - Amber input field + Add button visible
    - Can record excess
- **Notifications on Order Cards**: "Inventory can assemble X extra boxes" (amber text below assembly product)
- **Load on Tab**: `loadExcess()` called with `loadAssemblyOrders()` and `loadInventory()`

#### 6. Auto-Deduct Excess on New Orders
- **File**: `apps/api/src/orders/orders.service.ts`
- **New Private Method**: `autoDeductProductStock(orderId: string)`
- **Behavior**:
  - When order created or moved to `in_production` status
  - For each order item: check if `product_stock` has existing boxes
  - Auto-apply up to remaining boxes needed
  - Decrement `product_stock` accordingly
- **Called From**:
  - `create()` method: Lines ~65 (after item insertion, before mfg order generation)
  - `update()` method: Lines ~110 (when status changes to in_production)

#### 7. Hot Reload Development Setup
- **Command**: `npm run electron:dev`
- **Enables**:
  - Next.js hot reload (.tsx/.css changes)
  - API TypeScript watch (.ts recompile)
  - Electron TypeScript watch (main/preload .ts recompile)
  - Electronmon auto-restart on file changes
- **Backend**: HTTP polling fallback + IPC message listening (dual reliability)

### Files Modified Summary
| File | Lines Changed | What |
|------|---------------|------|
| `apps/api/src/assembly/assembly.service.ts` | +150 | getExcessAssembly(), recordExcessAssembly() with locked validation |
| `apps/api/src/assembly/assembly.controller.ts` | +8 | POST /assembly/record-excess, GET /assembly/excess routes |
| `apps/api/src/orders/orders.service.ts` | +40 | autoDeductProductStock() method + call in create/update |
| `apps/api/src/stock/stock.service.ts` | 1 line | Filter: where: { status: 'in_production' } |
| `components/features/production-tab.tsx` | +90 | handlePrintAssembly() + onPrintAssembly prop |
| `components/production-order-card.tsx` | +4 | onPrintAssembly button + prop |
| `components/features/inventory-tab.tsx` | +180 | ExcessAssemblyCard + ExcessProductRow + loadExcess() |
| `lib/api-client.ts` | +8 | getExcessAssembly(), recordExcessAssembly() exports |
| `lib/api-bridge.ts` | +5 | ElectronAPI bridge methods |
| `types/ipc.ts` | +10 | ExcessAssemblyData type + ElectronAPI interface updates |

### Backend Validation Rules
- **getExcessAssembly()**: No changes (pure read) — always succeeds
- **recordExcessAssembly()**:
  - ✓ boxes > 0
  - ✓ Product exists
  - ✓ Product NOT locked (no unfinished orders)
  - ✓ Sufficient inventory for all elements
  - ✗ Throws BadRequestException with clear message if any fail
- **autoDeductProductStock()**:
  - Non-blocking (catches errors gracefully)
  - Updates order item boxesAssembled + decrements productStock
  - Runs transactionally

### Build & Installer Status
```
✅ Full Production Build: npm run build:production
✅ Installer Created: Production Management-Setup-0.2.3.exe (233+ MB, signed)
✅ Dev Server: npm run electron:dev (hot reload enabled)
✅ API: NestJS running, routes visible in logs:
   - GET  /api/assembly/excess
   - POST /api/assembly/record-excess
   - (All previous routes intact)
```

### Testing Checklist
- [x] Build succeeds (all TypeScript compiles)
- [x] Dev server starts with hot reload
- [x] API endpoints responding on http://127.0.0.1:4123
- [x] Installer created and signed
- [x] App launches from installer
- [x] Assembly print sheet prints correctly
- [x] Shipped orders hidden from stock tab
- [x] Excess assembly card shows + locked states work
- [x] Auto-deduct applies on new in_production orders

### Status
**✅ PHASE 7 COMPLETE** — All assembly & excess features implemented, tested, built, and production installer updated (v0.2.3).

---

## Phase 8: Bug Fixes & Material Management (2026-02-10)

### Issues Fixed

#### 1. Shipped Orders Still Appearing in Stock Tab
- **Problem**: After refreshing the app, shipped orders were still visible in the stock tab despite being marked as shipped
- **Root Cause**: Stock tab was not properly refreshing after order status change; API filter was correct but frontend cached data
- **Solution**: 
  - Added `Ship` button to stock cards (visible when all boxes assembled)
  - Clicking "Ship" updates order status + removes order from local UI state
  - Added `deductProductStockOnShip()` method to decrement `productStock.stockBoxedAmount` when order ships
  - File: `components/features/stock-tab.tsx`
- **Impact**: Stock tab now properly reflects shipping status in real-time

#### 2. Raw Material Insufficiency Not Visible
- **Problem**: Users couldn't see if they had enough raw materials before/after placing an order
- **Solution**:
  - Added `checkMaterialAvailability(orderId: string)` method in [orders.service.ts](apps/api/src/orders/orders.service.ts)
    - Calculates total raw material needs across all order items
    - Compares against current storage stock
    - Returns list of shortages with exact quantities (material name, unit, needed, have, short amount)
  - New API endpoint: `GET /api/orders/:id/material-check`
  - Frontend warnings in [orders-tab.tsx](components/features/orders-tab.tsx):
    - Shown when moving order to "In Production"
    - Shown after adding items to an order
    - Alert lists each material shortage (non-blocking — order still goes through)
  - Files Modified:
    - `apps/api/src/orders/orders.service.ts` (+60 lines)
    - `apps/api/src/orders/orders.controller.ts` (+4 lines)
    - `components/features/orders-tab.tsx` (+30 lines)
    - `lib/api-client.ts` (+1 line)
    - `lib/api-bridge.ts` (+1 line)
    - `types/ipc.ts` (+10 lines)
- **Impact**: Users now know exactly what raw materials are needed and can restock proactively

#### 3. Unit Conversion Bug (kg ↔ g)
- **Problem**: Raw materials stored in kg were not properly converted when deducting from storage during production/assembly
  - Elements consume by weight in grams
  - Raw materials store in mixed units (g, kg, units, etc.)
  - Math was not converting between units, causing incorrect deductions
- **Solution**:
  - Production service now checks `rawMaterial.unit`:
    - If `'kg'`: converts `totalGrams / 1000` before deducting
    - If `'g'`: deducts as-is
  - Material check also applies conversion when calculating shortages
  - Transaction reasons now display converted amount (e.g., "0.500kg" instead of "500g")
  - Files Modified:
    - `apps/api/src/production/production.service.ts` (unit conversion in deduction)
- **Example**: 
  - Element: 10g per unit
  - Production: 50 units = 500g needed
  - Raw material unit: kg → deducts 0.5kg (not 500g)
  - Previous bug: Would have deducted 500kg, corrupting stock
- **Impact**: Raw material consumption now mathematically correct regardless of storage unit

### New API Endpoint
```
GET /api/orders/:orderId/material-check
Response: {
  shortages: [
    {
      materialName: "Plastic Pellets",
      unit: "kg",
      totalNeeded: 2.5,
      currentStock: 1.2,
      shortage: 1.3
    }
  ],
  sufficient: false
}
```

### UI Updates

#### Stock Tab
- Stock cards for completed orders now show green **Ship** button
- Clicking Ship marks order as shipped + removes from view
- Shipped orders no longer appear on refresh

#### Orders Tab
- After adding items or changing status to "In Production", material shortage alert appears
- Alert shows: `⚠️ Raw Material Shortage` with list of needed materials
- Format: `• Material Name: need X unit, have Y unit (short Z unit)`
- Non-blocking — order proceeds but user is informed

### Testing Verification
- [x] Stock tab shows only in_production orders (shipped removed)
- [x] Ship button appears on completed orders
- [x] Shipping order removes it from stock tab
- [x] Material check calculates shortages correctly
- [x] Warnings shown when placing orders with insufficient materials
- [x] kg/g conversion accurate in production deductions
- [x] Transaction logs show converted amounts
- [x] Build succeeds with all new code
- [x] Installer created and updated (v0.2.3)
- [x] App reinstalled and verified

### Files Modified Summary
| File | Change | Type |
|------|--------|------|
| `apps/api/src/orders/orders.service.ts` | +60 lines | `deductProductStockOnShip()`, `checkMaterialAvailability()` |
| `apps/api/src/orders/orders.controller.ts` | +4 lines | GET /material-check route |
| `apps/api/src/production/production.service.ts` | +3 lines | kg/g unit conversion in deduction |
| `components/features/stock-tab.tsx` | +40 lines | Ship button + handler, remove shipped orders |
| `components/features/orders-tab.tsx` | +30 lines | Material shortage check + alerts |
| `lib/api-client.ts` | +1 line | checkMaterialAvailability export |
| `lib/api-bridge.ts` | +1 line | checkMaterialAvailability bridge |
| `types/ipc.ts` | +10 lines | MaterialCheckResponse type + ElectronAPI method |

### Status
**✅ PHASE 8 COMPLETE** — Critical shipping & material management bugs fixed. Stock tab properly filters shipped orders, material shortages are visible before/after order placement, and unit conversion is mathematically correct. App reinstalled with v0.2.3 signed installer.

---

## Phase 9: Assembly UI Overhaul & Validation Enforcement (2026-02-10)

### User Requirements Addressed
1. **Assembly window shows all orders** — with needed amounts to finish, not just pending ones
2. **Excess card shows all products** — not just ones in active orders; locked if any unfinished orders exist
3. **Material shortage prevents production** — orders cannot move to in_production without sufficient raw materials (auto-downgrades to pending with note)
4. **Cannot ship incomplete orders** — shipping rejected if any product hasn't been fully assembled
5. **Excess cannot be assembled over unfinished orders** — explicit lock on excess card prevents accidental deductions

### Backend Changes

#### Assembly Service (`apps/api/src/assembly/assembly.service.ts`)
**getOrders()**
- Removed `.filter((order) => order.products.some((p) => p.remaining > 0))` 
- All `in_production` orders now appear, including those with some products completed
- Frontend can display all orders with their progress toward completion

**getExcessAssembly()**
- **Rewritten to scan ALL products**, not just active order items
- Changed from: `product.findMany() within order.orderItems` 
- Changed to: `product.findMany()` → calculate per-product capacity independently
- Queries `orderItem.findMany()` separately to check for unfinished assembly
- For each product, sets `locked: true` if ANY orderItem with that product has `boxesAssembled < boxesNeeded`
- Result: Excess card shows full inventory potential but respects incomplete orders

#### Orders Service (`apps/api/src/orders/orders.service.ts`)
**Added `BadRequestException` import** — for shipping/production validation errors

**create() method**
- Added material availability check before allowing `in_production` status
- If materials insufficient: auto-downgrades to `pending`, saves shortage note, returns pending order
- Note format: `⚠️ Pending: Insufficient raw materials — Material1: need X unit, have Y unit; Material2: need Z unit, have W unit`
- Non-blocking for UI but blocks production start

**update() method**
- **Shipping validation**: Queries all orderItems, checks `boxesAssembled >= boxesNeeded` for each
  - If any product incomplete: throws `BadRequestException` with detailed list
  - Error message: `Cannot ship — not all products fully assembled: Product1: 5/10 boxes assembled, Product2: 0/8 boxes assembled`
- **Production validation**: Calls `getRawMaterialShortages()` before allowing `in_production` transition
  - If insufficient: saves shortage note to order AND throws error (prevents transition)
  - User sees error alert, must restock before retrying

**getRawMaterialShortages() (new private method)**
- Extracted from `checkMaterialAvailability()` for code reuse in create/update
- Same logic: aggregates material needs across order items, applies kg/g conversion
- Returns: `{ shortages, sufficient }`

**checkMaterialAvailability() (public)**
- Now calls `getRawMaterialShortages()` and serializes result
- Exposed as GET endpoint for frontend material checks

### Frontend Changes

#### Inventory Tab (`components/features/inventory-tab.tsx`)
**handleRecordAssembly()**
- Removed filter: `setAssemblyOrders(prev => updated.filter(order => order.products.some(p => p.remaining > 0)))`
- Orders stay in list after partial completion
- Allows user to continue adding to the same order

#### Orders Tab (`components/features/orders-tab.tsx`)
**handleStartProduction()**
- Simplified: removed inline material check (backend now enforces)
- If error (materials insufficient): shows alert and reloads orders
- User sees pending order with shortage note in orders list

**handleShipOrder()**
- Added error handling: catches `result.error` and shows alert
- If backend rejects (incomplete products): displays product-level rejection reason

**handleOrderItemsDone()**
- Removed material shortage check (backend handles during order create)
- Just closes modal and reloads

### Validation Flow (Complete)

```
CREATE ORDER with items as in_production
 ├─ Backend: checkMaterialAvailability()
 ├─ Insufficient?
 │  ├─ Save note with shortage list
 │  └─ Auto-downgrade to pending
 └─ Return pending order with note

UPDATE ORDER: pending → in_production
 ├─ Backend: checkMaterialAvailability()
 ├─ Insufficient?
 │  ├─ Save note
 │  └─ Throw BadRequestException
 └─ Frontend: Show error alert, reload to show pending with note

UPDATE ORDER: * → shipped
 ├─ Backend: Check all products boxesAssembled >= boxesNeeded
 ├─ Any incomplete?
 │  └─ Throw BadRequestException with details
 └─ Frontend: Show error alert preventing ship

ASSEMBLY: Record boxes
 ├─ Order persists in list (not filtered out)
 ├─ User can continue updating other products
 └─ All orders visible regardless of completion state

EXCESS: Calculate potential
 ├─ Query ALL products (not just in orders)
 ├─ For each: check if ANY orderItem has unfinished assembly
 ├─ locked: true if unfinished found
 └─ UI: Disabled input if locked, shows "Finish orders first"
```

### Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `apps/api/src/assembly/assembly.service.ts` | Removed order filter; rewrite getExcessAssembly to scan all products | +30, -40 |
| `apps/api/src/orders/orders.service.ts` | Added BadRequestException; validate shipping completeness; validate production materials; extract getRawMaterialShortages | +80 |
| `components/features/inventory-tab.tsx` | Remove filter hiding completed orders | -5 |
| `components/features/orders-tab.tsx` | Simplify handleStartProduction, add error handling to handleShipOrder, remove inline material check in handleItemsDone | -25 |

### Build & Verification
✅ TypeScript compilation: All files compile without errors
✅ Full production build: `npm run build:production` passes (icons + Next.js + API tsc + Electron tsc)
✅ Installer creation: Production Management-Setup-0.2.3.exe signed and created (233+ MB)
✅ Installation: App reinstalled on user device, v0.2.3 confirmed

### Key Behavioral Changes for User
1. **Assembly tab now shows all orders** (not auto-hidden when complete)
   - Can see 0/5, 3/5, 5/5 in one screen
   - Continue updating even if some products done

2. **Excess assembly calculated from full product catalog**
   - Not limited to products in active orders
   - If product has ANY unfinished boxes in ANY in_production order → locked

3. **Orders auto-pending if materials short**
   - User sees note explaining shortage
   - No guessing why production won't start

4. **Cannot ship without full assembly**
   - Before: silently allowed incomplete shipments
   - After: explicit error message showing which products incomplete

5. **Cannot over-assemble into excess during active orders**
   - Excess locked while product has unfinished orders
   - Prevents accidental stock corruption

### Status
**✅ PHASE 9 COMPLETE** — Assembly UI fully rewritten, excess card respects order completeness, material validation prevents invalid state transitions, shipping blocked if incomplete. All validations enforced at backend with user-facing error messages. App v0.2.3 installed and ready for testing.

---

## Phase 10: Bug Fixes & Feature Requests (2026-02-10)

**Context**: User tested Phase 9 app and reported:
1. Cannot edit color of cloned element → clone is missing fields
2. Check if same bug in products (fix if found)
3. Add assembly print sheet (requested format/layout)
4. Add excess stock card to stock tab (permanent, visible)
5. Auto-deduct excess stock shows remaining amount needed

### Changes Made

#### 1. Element Clone Bug Fix
**Files**: `components/features/elements-tab.tsx`

**Issue**: `handleCloneElement()` was not passing `rawMaterialId` and `label` to `createElement()`
- Result: Cloned elements lost these fields
- User tried to edit cloned element → rawMaterialId was undefined, label was empty

**Fix** (lines 72-73):
```typescript
// Added to createElement() call:
label: element.label || '',
rawMaterialId: element.rawMaterialId ?? undefined,
```

**Verification**: Products clone function already copies all fields correctly (no fix needed)

---

#### 2. Assembly Print Sheet Redesign
**Files**: `components/features/production-tab.tsx` 

**Previous state**: Generic block layout (one product per block)

**New design**:
- **Standalone function**: Completely separate from production print (no shared logic)
- **Landscape A4**: Default orientation for wider content
- **Dynamic table layout**: Serial Number | Product Image | Product Label | Element columns
- **Dynamic sizing**: Font size, padding, image size, color dot size all adapt to column count
  - ≤6 cols: 13px font, 48px images, 18px dots
  - ≤10 cols: 11px font, 40px images, 16px dots
  - ≤14 cols: 9px font, 32px images, 14px dots
  - >14 cols: 7px font, 24px images, 12px dots
- **Column proportions**: Adjust based on total columns (similar to production pivot table)

**Code pattern**:
```typescript
const totalCols = fixedCols + allElementIds.length;
// Calculate fontSize, padding, imgSize based on totalCols
const snColPct = Math.max(8, Math.round(100 / totalCols * 1.5));
const imgColPct = Math.max(5, Math.round(100 / totalCols * 0.8));
// ... build dynamic colgroup and table header/body
```

**Impact**: Assembly sheet now automatically adapts to any number of products/elements, always fitting on one A4-L page legibly.

---

#### 3. Excess Stock Card in Stock Tab
**Files**: `components/features/stock-tab.tsx`

**Added**:
- New state: `excessStock`, `isLoadingExcess`
- New function: `loadExcessStock()` — fetches `getProductStock()` and filters by `stockBoxedAmount > 0`
- New component: `ExcessStockCard()` — displays excess stock with product image, serial, label, box count
- UI: Card always visible at top of Stock tab (before order cards)
- Styling: Amber/warning color scheme to distinguish from order stock

**Behavior**:
- Shows total boxes across all excess stock in header
- Grid of products in excess stock
- "No excess stock" message when empty
- Refresh button reloads both order stock and excess stock

**Impact**: Excess inventory is now transparent and always visible, improving warehouse management.

---

#### 4. Auto-Deduct Excess Stock Feedback
**Files**: 
- `apps/api/src/orders/orders.service.ts`
- `components/features/orders-tab.tsx`
- `types/ipc.ts`

**Backend fix** (orders.service.ts, lines 165-171):
```typescript
// Before: returned order snapshot BEFORE auto-deduction
// After: re-fetch order AFTER auto-deduction applies
const updatedOrder = await this.prisma.order.findUnique({
  where: { id },
  include: this.defaultInclude,
});
return serialize(updatedOrder);
```

**Type update** (types/ipc.ts):
- Added `boxesAssembled: number;` to `OrderItemResponse` interface
  - Was missing even though backend always included it
  - Now response contract is complete

**Frontend feedback** (orders-tab.tsx, handleStartProduction):
```typescript
const items = result.data.orderItems ?? [];
const applied = items.filter(i => i.boxesAssembled && i.boxesAssembled > 0);
if (applied.length > 0) {
  const details = applied.map(i => 
    `${i.product?.serialNumber ?? 'Product'}: ${i.boxesAssembled} box${...} from stock`
  ).join('\n');
  alert(`Stock auto-applied:\n${details}`);
}
```

**Behavior**:
- When user clicks "Start Production" on an order:
  1. Backend checks excess stock via `autoDeductProductStock()`
  2. For each order item, if excess stock available, applies to `boxesAssembled`
  3. Re-fetches updated order with correct `boxesAssembled` values
  4. Frontend shows alert listing which products got stock applied (e.g., "ProductA: 5 boxes from stock")
- Stock is automatically deducted from `productStock` table

**Impact**: Users now see exactly what stock was auto-applied, increasing transparency and reducing confusion.

---

### Build & Testing

| Aspect | Status |
|--------|--------|
| Next.js build | ✅ Compiled successfully (1.9s) |
| API type check | ✅ No TypeScript errors |
| Electron build | ✅ Compiled (tsc) |
| Installer signing | ✅ 3 files code-signed |
| Production build | ✅ Complete |
| Installation | ✅ Silent install successful |
| App launch | ✅ Running |

**Installer**: `Production Management-Setup-0.2.3.exe` (same version, new features)

---

### Feature Validation

#### Element Clone
- ✅ Clone element with raw material assigned
- ✅ Cloned element retains label
- ✅ Edit cloned element — all fields editable

#### Assembly Print
- ✅ Single-product order: compact layout, no wasted space
- ✅ Multi-product order: columns scale appropriately
- ✅ Many elements (>10): font reduces, remains legible
- ✅ Color circles render for both single/dual-color elements
- ✅ Element labels display (or name if no label)
- ✅ Landscape A4 by default

#### Excess Stock Card
- ✅ Visible when products have stock
- ✅ Shows correct total
- ✅ Product images/labels display
- ✅ "No excess stock" when empty
- ✅ Refresh updates both sections

#### Auto-Deduct
- ✅ Stock auto-applies on "Start Production"
- ✅ Alert shows correct products and quantities
- ✅ `boxesAssembled` updates in response
- ✅ Stock deducted from `productStock` table

---

### Files Modified

| File | Change | Lines |
|------|--------|-------|
| `components/features/elements-tab.tsx` | Element clone: add `rawMaterialId`, `label` | ~72-73 |
| `components/features/production-tab.tsx` | Rewrite `handlePrintAssembly()` function | ~48-157 |
| `components/features/stock-tab.tsx` | Add excess stock state, loader, card component | +80 |
| `apps/api/src/orders/orders.service.ts` | Re-fetch order after auto-deduction | 165-171 |
| `components/features/orders-tab.tsx` | Add auto-deduct feedback alert | ~64-75 |
| `types/ipc.ts` | Add `boxesAssembled` to `OrderItemResponse` | ~254 |

---

### Backward Compatibility
✅ All changes backward compatible:
- Element cloning gracefully handles missing fields (defaults to blank/null)
- Assembly print adapts to any order complexity
- Excess stock card handles both populated and empty states
- Auto-deduct logic unchanged; only response data corrected

---

### Dependencies
No new dependencies added. All changes use existing libraries:
- React hooks for state management
- Prisma for database operations
- NestJS for backend service logic

---

### Next Steps / Future Enhancements
1. Replace alert notifications with toast notifications (less intrusive)
2. Option to exclude labeled elements from assembly print (if output too wide)
3. Stock transfer UI — move excess between products
4. Historical stock reports — track excess usage

---

### Status
**✅ PHASE 10 COMPLETE** — Element clone bug fixed, assembly print sheet redesigned as standalone dynamic function (landscape, adaptive sizing), excess stock card added to Stock tab (always visible, transparent inventory management), auto-deduct feedback shows user exactly what stock was applied. All features tested and working. Installer built, signed, installed successfully. v0.2.3 ready for production.

---

## Phase 11 — i18n, UX Improvements, Order Editing & Print in Assembly

**Date**: 2026-02-10

### Overview
Four features implemented in a single pass:
1. **Multi-language support** (English, Albanian, Macedonian) — extensible i18n system
2. **Assembly print button** added to Inventory/Assembly tab
3. **Order edit restrictions** — editable in pending/production, locked when shipped
4. **Stock tab UX** — status messages for incomplete vs complete orders

---

### Feature 1: Internationalization (i18n)

#### Architecture
- **`lib/i18n.tsx`** (new, ~700 lines) — Complete i18n system using React Context
  - `I18nProvider` wraps the app (added to `app/layout.tsx`)
  - `useI18n()` hook returns `{ t, language, setLanguage }` 
  - `LanguagePicker` dropdown component (flag + name + checkmark)
  - Type-safe `TranslationKeys` type (~120 keys) — compiler catches missing translations
  - `Language` type: `'en' | 'sq' | 'mk'` (English, Albanian, Macedonian)
  - `LANGUAGES` array with labels and flag emojis
  - Language preference persisted to `localStorage`
  - Translation key namespaces: app, nav, common, orders, orderDetail, production, inventory, stock, storage, products, elements, print

#### Adding a new language
1. Add code to `Language` type: `'en' | 'sq' | 'mk' | 'fr'`
2. Add entry to `LANGUAGES` array: `{ code: 'fr', label: 'Français', flag: '🇫🇷' }`
3. Add full translation record to `translations` object
4. Done — all components automatically pick up the new language

#### Components updated with i18n
- `app/page.tsx` — header, nav tabs, version/update text, LanguagePicker
- `components/features/orders-tab.tsx` — filters, search, buttons, empty states, edit modal
- `components/features/production-tab.tsx` — title, subtitle, buttons, loading/empty states
- `components/features/inventory-tab.tsx` — element inventory panel, assembly panel, excess assembly
- `components/features/stock-tab.tsx` — header, ship button, status messages, excess stock card
- `components/features/products-tab.tsx` — toolbar, search, loading, modals (Edit/Clone)
- `components/features/elements-tab.tsx` — toolbar, search, loading, modals (Create/Edit)
- `components/features/storage-tab.tsx` — header, search, loading, modals (Create/Edit/Adjust)
- `components/order-card.tsx` — status badges, all action buttons (Produce/Ship/Confirm/etc.)
- `components/order-detail-modal.tsx` — status labels, summary, notes, products, close button
- `components/production-order-card.tsx` — badge, print tooltips, element row labels, footer

---

### Feature 2: Assembly Print Button

- **`lib/print-assembly.ts`** (new, ~130 lines) — Shared utility extracted from production-tab
  - `printAssemblySheet(orderId: string): Promise<void>`
  - Fetches order via `window.electron.getOrderById()`
  - Builds dynamic HTML table (A4 landscape, adaptive column sizing)
  - Opens print preview window with auto-print trigger
- **`components/features/inventory-tab.tsx`** — Added print button (printer icon) to `AssemblyOrderCard` header
- **`components/features/production-tab.tsx`** — Replaced ~100-line inline `handlePrintAssembly` with 3-line call to shared `printAssemblySheet()`

---

### Feature 3: Order Edit Restrictions

- **`components/order-card.tsx`** — Added `onEdit` prop, `isEditable` check (`order.status !== 'shipped'`)
  - Pending/In Production: Shows pencil icon "Edit" button
  - Shipped: Shows lock icon (no edit allowed), tooltip "Shipped orders cannot be edited"
- **`components/features/orders-tab.tsx`** — Added `EditOrderModal` component
  - Opens when user clicks Edit on a non-shipped order
  - Allows editing order notes field
  - Calls `window.electron.updateOrder(order.id, { notes })` on save
  - Auto-refreshes order list after save

---

### Feature 4: Stock Tab UX Improvements

- **`components/features/stock-tab.tsx`** — `StockOrderCard` updated:
  - Previously: Ship button only visible when `allComplete`, nothing shown otherwise
  - Now when incomplete: Shows grey "clock" icon badge with message "Not all products assembled yet"
  - Now when complete: Shows green Ship button with checkmark + "Order complete — ready to ship" tooltip
  - `ExcessStockCard` also updated with i18n translations

---

### Files Created
| File | Lines | Purpose |
|------|-------|---------|
| `lib/i18n.tsx` | ~700 | i18n system (context, hook, translations, picker) |
| `lib/print-assembly.ts` | ~130 | Shared print utility for assembly sheets |

### Files Modified
| File | Changes |
|------|---------|
| `app/layout.tsx` | Added I18nProvider wrapping |
| `app/page.tsx` | LanguagePicker, translated nav + header |
| `components/features/orders-tab.tsx` | Edit modal, i18n, fixed duplicate JSX |
| `components/features/production-tab.tsx` | Shared print utility, i18n |
| `components/features/inventory-tab.tsx` | Print button, i18n (all sub-components) |
| `components/features/stock-tab.tsx` | UX status messages, i18n |
| `components/features/products-tab.tsx` | i18n (toolbar, modals) |
| `components/features/elements-tab.tsx` | i18n (toolbar, modals) |
| `components/features/storage-tab.tsx` | i18n (toolbar, modals) |
| `components/order-card.tsx` | Edit button/lock, i18n (all action buttons, badges) |
| `components/order-detail-modal.tsx` | i18n (status, summary, notes, products) |
| `components/production-order-card.tsx` | i18n (badge, labels, tooltips) |

### Dependencies
No new dependencies. All changes use existing React, Next.js, and Electron APIs.

---

### Status
**✅ PHASE 11 COMPLETE** — Multi-language i18n system (EN/SQ/MK) with type-safe translations, assembly print button in inventory tab, order edit restrictions with visual lock/unlock UX, stock tab improved with status messages for incomplete/complete orders. Build passes cleanly. App tested and running.

---

## Phase 12 — Order Item CRUD & Assembly Bug Fixes (2026-02-10)

### Version 0.2.4 Changes

#### 1. Full Order Item Management in Edit Modal
- Rewrote `EditOrderModal` in `components/features/orders-tab.tsx` to support add/remove/update products
- Backend: `addOrderItem()`, `removeOrderItem()`, `updateOrderItem()` in `apps/api/src/orders/orders.service.ts`
- REST endpoints: `POST /orders/:id/items`, `PUT /orders/items/:itemId`, `DELETE /orders/items/:itemId`
- Full IPC layer: `lib/api-client.ts`, `lib/api-bridge.ts`, `types/ipc.ts` all wired up

#### 2. Assembly Input Freeze Bug Fix
**Problem:** When user entered more boxes than inventory allowed, backend returned error. Frontend used `alert()` to display it, which blocked React's event loop. After dismissing alert, input froze — user could not type a new value.
**Root Cause:** `alert()` is synchronous and interrupts React's state batching. The `isSubmitting` and error state updates conflicted with the blocked UI thread.
**Fix:**
- Changed return types from `Promise<boolean>` to `Promise<string | true>` — returns error message string instead of `false`
- Removed ALL `alert()` calls from assembly error handling
- Errors now display inline as `<p>` elements below input (with `break-words` for long messages)
- Input cleared after error so user can immediately retry
- Added `loadAssemblyOrders()` on successful record to refresh maxAssemblable

#### 3. Inventory Assemblable Count Hint
**Feature:** Shows "Inventory can make **X** box(es)" text above the assembly input field
**Implementation:**
- Backend `getOrders()` now queries `productElements` with elements and calculates `maxAssemblable` per product
- Uses same dual-color halving logic as excess assembly calculation
- Added `maxAssemblable: number` to `AssemblyProductEntry` type
- Frontend displays hint in `AssemblyProductRow` above the input

#### 4. electron-builder.json Fix
- Moved `publisherName: "Elion Shate"` from invalid `win` section position — property is not recognized by electron-builder v26.7.0 in either `win` or `nsis` sections
- Removed the property entirely; publisher name comes from the code-signing certificate

### Files Modified
| File | Change |
|------|--------|
| `apps/api/src/assembly/assembly.service.ts` | `getOrders()` now includes productElements + calculates maxAssemblable |
| `apps/api/src/orders/orders.service.ts` | Added addOrderItem, removeOrderItem, updateOrderItem methods |
| `apps/api/src/orders/orders.controller.ts` | 3 new REST endpoints for order items |
| `components/features/inventory-tab.tsx` | Freeze fix (no alert), inline errors, assemblable hint text |
| `components/features/orders-tab.tsx` | Rewrote EditOrderModal with full item CRUD |
| `lib/api-client.ts` | 3 new order item API functions |
| `lib/api-bridge.ts` | 3 new bridge methods |
| `types/ipc.ts` | maxAssemblable field + 3 new ElectronAPI methods |
| `electron-builder.json` | Removed invalid publisherName from win section |
| `package.json` | Version 0.2.3 → 0.2.5 |
| `apps/api/package.json` | Version 0.2.3 → 0.2.5|

---

## Phase 13 — Gitignore Fix for Agent Files (2026-02-11)

### Problem
The `.gitignore` had incorrect filenames in its markdown exceptions:
- `!@agent_logs_refactor.md` — **file does not exist** (wrong name)
- `!@refactor_instructions.md` — **file does not exist** (wrong name)

The actual local-only agent files are:
- `@agent_logs.md`
- `@agent_instructions.md`

Because of the `!` (un-ignore) prefix with wrong filenames, the exceptions had no effect. Meanwhile, `*.md` correctly ignored all `.md` files including the real agent files — so they happened to be ignored by accident rather than by design.

**Risk**: If someone later added `!@agent_logs.md` or `!@agent_instructions.md` to track them, a `git pull` that deletes or modifies those files would destroy local agent context.

### Fix Applied
**File**: `.gitignore`

**Before**:
```gitignore
# markdown files (except README.md, INSTALL.md and @agent_logs.md which are docs)
*.md
!README.md
!INSTALL.md
!@agent_logs_refactor.md
!@refactor_instructions.md
```

**After**:
```gitignore
# markdown files (except README.md and INSTALL.md which are docs)
# @agent_logs.md and @agent_instructions.md are LOCAL-ONLY agent files — kept ignored so git pull never deletes them
*.md
!README.md
!INSTALL.md
```

### What Changed
- Removed `!@agent_logs_refactor.md` (stale, wrong filename)
- Removed `!@refactor_instructions.md` (stale, wrong filename)
- Updated comment to document the correct agent file names and their LOCAL-ONLY intent
- `@agent_logs.md` and `@agent_instructions.md` remain ignored under `*.md` — git will never track, delete, or overwrite them

### Files Modified
| File | Change |
|------|--------|
| `.gitignore` | Removed 2 stale `!` exceptions, updated comment for agent file intent |

### Status
**✅ PHASE 13 COMPLETE** — Agent files (`@agent_logs.md`, `@agent_instructions.md`) are properly ignored by git. Pulling from the repo will never touch these local-only files.

---

## Phase 14 — Performance Hardening & Hotfixes (v0.2.5 → v0.2.6)
**Date**: 2026-02-11  
**Mandate**: Optimize for low-end hardware (<4GB RAM, weak single-core CPUs). Fix freezing issues from concurrent operations and multiple app instances.

### Tasks Completed

#### A. Single Instance Lock (Electron)
- Added `app.requestSingleInstanceLock()` to `electron/main/index.ts`
- If a second instance tries to launch, it is immediately quit
- If a second instance is detected while one is already running, the existing window is focused (restored from minimized if needed)
- Prevents database lock contention and memory exhaustion from multiple instances

#### B. Debounced Search Inputs (All Tabs)
- Created `hooks/use-debounce.ts` with `useDebouncedValue<T>(value, delay)` and `useAsyncGuard()` utilities
- Applied 300ms debounced search to:
  - `elements-tab.tsx` — `elementSearch` → `debouncedSearch`
  - `orders-tab.tsx` — `orderSearch` → `debouncedSearch`
  - `products-tab.tsx` — `search` → `debouncedSearch`
  - `storage-tab.tsx` — `rawMaterialSearch` → `debouncedSearch`
- All `useMemo` filter computations now depend on the debounced value, eliminating main-thread blocking on every keystroke

#### C. Async Guard on Delete/Clone Handlers (Freezing Fix)
- Added `isProcessing` state flag to all tab components
- Guarded all destructive/mutating operations to prevent concurrent execution:
  - `elements-tab.tsx` — `handleDeleteElement`, `handleCloneElement`
  - `orders-tab.tsx` — `handleStartProduction`, `handleShipOrder`, `handleDeleteOrder`
  - `products-tab.tsx` — `handleDeleteProduct`
  - `storage-tab.tsx` — `handleDeleteRawMaterial`
  - `inventory-tab.tsx` — `handleDeleteInventory`
- Each handler now checks `isProcessing` before executing and sets it to `true` during operation, with `finally` blocks ensuring cleanup

#### D. React.memo on Heavy Components
- Wrapped the following sub-components with `React.memo` to prevent unnecessary re-renders:
  - `elements-tab.tsx` — `ElementCard`
  - `inventory-tab.tsx` — `AssemblyOrderCard`, `AssemblyProductRow`, `ExcessAssemblyCard`, `ExcessProductRow`
  - `stock-tab.tsx` — `StockOrderCard`, `ExcessStockCard`
  - `production-order-card.tsx` — `ProductionOrderCard`

#### E. Manual Inventory Addition Form
- Added "Add Inventory" button to the inventory tab header
- New `AddInventoryModal` component with:
  - Element search & select (scrollable list with color swatches)
  - Quantity input (numeric, validated ≥ 1)
  - Calls `adjustInventory` API with `reason: 'Manual addition'`
  - Optimistic UI refresh after successful addition
- Full i18n support added (EN/SQ/MK) — 10 new translation keys:
  - `inventory.addManual`, `inventory.element`, `inventory.searchElement`, `inventory.noElementsMatch`, `inventory.selected`, `inventory.quantity`, `inventory.enterQuantity`, `inventory.addToInventory`, `inventory.selectElement`, `inventory.validQuantity`

#### F. Polling Assessment
- Reviewed `api-client.ts` — confirmed NO polling exists. All data loads are on tab mount/remount only.
- No SWR or interval-based revalidation needed since fetch is purely on-demand.

### Files Created
| File | Purpose |
|------|---------|
| `hooks/use-debounce.ts` | `useDebouncedValue` hook + `useAsyncGuard` utility |

### Files Modified
| File | Change |
|------|--------|
| `electron/main/index.ts` | Single instance lock (`requestSingleInstanceLock`), `second-instance` handler |
| `components/features/elements-tab.tsx` | Debounced search, `isProcessing` guard, `ElementCard` → `React.memo` |
| `components/features/orders-tab.tsx` | Debounced search, `isProcessing` guard on all order actions |
| `components/features/products-tab.tsx` | Debounced search, `isProcessing` guard on delete |
| `components/features/storage-tab.tsx` | Debounced search, `isProcessing` guard on delete |
| `components/features/stock-tab.tsx` | `StockOrderCard` + `ExcessStockCard` → `React.memo` |
| `components/features/inventory-tab.tsx` | `isProcessing` guard, `AddInventoryModal`, 4 sub-components → `React.memo` |
| `components/production-order-card.tsx` | `ProductionOrderCard` → `React.memo` |
| `lib/i18n.tsx` | Added 10 inventory translation keys (EN/SQ/MK) |

### Build Verification
```
npm run build:production → ✅ PASS
  - next build: Compiled successfully in 1841.6ms
  - apps/api tsc: Clean
  - electron tsc: Clean
```

### Status
**✅ PHASE 14 COMPLETE** — Performance optimizations and hotfixes applied. Single instance lock prevents multiple app processes. Debounced search + async guards eliminate UI freezing on low-end hardware. React.memo reduces unnecessary re-renders. Manual inventory addition form operational with full i18n support.