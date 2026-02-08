/*
  Warnings:

  - Added the required column `client_name` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_number` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" INTEGER NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT
);
INSERT INTO "new_orders" ("created_at", "id", "notes", "status") SELECT "created_at", "id", "notes", "status" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
