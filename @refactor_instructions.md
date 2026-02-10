# Role: Senior Full-Stack Architect & Refactoring Specialist

## 🧠 Context Extraction (from Agent Logs)
You are picking up **Phase 5** of a major Monolithic-to-Client/Server refactor.
* **Current State:** The app runs in Dev, but **crashes in Production**.
* **Root Cause:** The NestJS server (spawned via `utilityProcess`) cannot find `node_modules` (specifically `reflect-metadata`) inside the Electron ASAR archive.
* **Selected Solution:** **Option C (Bundling)**. You must bundle the NestJS API into a single standalone JavaScript file.
* **Database Goal:** The database schema must be **Supabase-ready** (UUIDs instead of Integers).
* **Architectural Pivot:** We are abandoning the strict "1,000 lines per file" rule. The new priority is **Clean Architecture, Efficiency, and Readability**.

---

## ⛔ CRITICAL OPERATIONAL PROTOCOLS
1.  **SMART SKIP (Idempotency):** Before executing ANY step, check the current state.
    * **If a file exists & matches the goal:** SKIP creation/modification.
    * **If a dependency is installed:** SKIP `npm install`.
    * **If the Schema already uses UUIDs:** SKIP the migration logic.
    * **Rule:** Do not redo work. Only execute steps required to close the gap between *Current State* and *Target State*.
2.  **Anti-Loop Protocol:** If a command fails **twice** with the same error, STOP and ask for guidance.
3.  **Preservation:** **DO NOT DELETE `dist/`**. This contains signed binaries. Only overwrite specific build artifacts.
4.  **Global Code Quality Standards (UPDATED):**
    * **Rule:** **Readability > Line Count.**
    * **Action:** Scan the *entire* codebase.
    * **Merge:** If you find files that were arbitrarily split *only* to satisfy the old 1,000-line limit (and are hard to follow), **merge them** back together if they logically belong in one place.
    * **Split:** If you find massive files (like `app/page.tsx`), split them based on **Feature Boundaries** (e.g., `OrderTable`, `InventoryList`), not arbitrary line counts.

---

## 🛠️ TASK LIST (Execute in Strict Order)

### TASK 1: Prisma Schema Standardization (Supabase Prep)
**Goal:** Ensure the database schema is future-proof for Supabase migration.
* **Smart Skip Check:** Open `apps/api/prisma/schema.prisma`. **IF** the models already use `String @id` and `UUID`, **SKIP THIS ENTIRE TASK** and move to Task 2.
* **Condition:** IF the models currently use Integer IDs (`Int @id @default(autoincrement())`):
    * **Action:** REFACTOR all `@id` fields to use UUIDs:
        ```prisma
        id String @id @default(uuid())
        ```
    * **Action:** Update all related **Foreign Keys** (relations) to be `String` type.
    * **Action:** Ensure **EVERY** model has `createdAt` and `updatedAt`.
* **Execute:** Run `npx prisma generate` to update client types (only if changes were made).

### TASK 2: Implement NestJS Bundling (Option C)
**Goal:** Create a single executable bundle at `dist/api/main.bundle.js` to fix the production crash.
* **Smart Skip Check:** Check if `apps/api/webpack.config.js` exists. If it does, verify it handles `reflect-metadata` correctly. If yes, skip configuration.
* **Action:**
    1.  Install `webpack-node-externals` (dev dependency) only if missing.
    2.  Create/Configure `apps/api/webpack.config.js`.
    3.  **Configuration Requirements:**
        * `target: 'node'`
        * `mode: 'production'`
        * `entry`: `apps/api/src/main.ts`
        * `output`: `filename: 'main.bundle.js', path: .../dist/api/`
        * **CRITICAL:** Bundle `reflect-metadata` and `class-transformer` (do not exclude them).
        * **Native Modules:** Exclude `better-sqlite3` and `@prisma/client` from the bundle (keep as externals).
    4.  **Update Script:** Modify `package.json` -> `build:production` to run this webpack build.

### TASK 3: Update Server Manager (`electron/main/server-manager.ts`)
**Goal:** Point the production spawner to the new bundle.
* **Smart Skip Check:** Read the file. If `utilityProcess.fork()` already points to `main.bundle.js`, SKIP this task.
* **Action:**
    * Locate the `utilityProcess.fork()` call in the production logic.
    * Change the target path from `.../main.js` to `.../main.bundle.js`.
    * Ensure `DATABASE_URL` and `PORT` env vars are passed correctly.

### TASK 4: Global Codebase & UI Refactor
**Goal:** Apply the new "Clean Architecture" standard to the whole codebase.
* **Priority 1 (`app/page.tsx`):** Refactor this 3,000-line file.
    * **Extract:** Pull logical features into `components/features/`.
    * **Simplify:** Use custom hooks to clean up the logic.
* **Priority 2 (General Scan):** Check `apps/api` and `electron/`.
    * **Fix:** If you see any files that were split illogically (e.g., `service.part1.ts`), merge them.
    * **Fix:** If you see massive files with mixed concerns, extract them.
    * **Cleanup:** Remove unused imports and dead code.

### TASK 5: Logging & Verification
* **Action:** Update `agent_logs_refactor.md`:
    * State clearly which tasks were **SKIPPED** due to prior completion.
    * Confirm Schema status.
    * Log the Webpack config details.
    * List significant refactoring moves.
    * Mark Phase 5 as "Resolved" ONLY if the production build runs successfully.

---

**Output:**
1.  List of skipped steps (proven by file checks).
2.  Confirmation of Schema updates (UUID check).
3.  The Webpack config used.
4.  Summary of the Global/UI Refactor.
5.  Confirmation that the production build works.
6.  Updated `agent_logs_refactor.md` with all details.