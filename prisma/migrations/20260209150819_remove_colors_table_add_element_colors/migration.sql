/*
  Warnings:

  - You are about to drop the `colors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `color_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `color_id` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `color_id` on the `material_requirements` table. All the data in the column will be lost.
  - You are about to drop the column `color_id` on the `product_elements` table. All the data in the column will be lost.
  - Added the required column `color` to the `elements` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "colors_color_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "colors";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unique_name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "color_2" TEXT,
    "is_dual_color" BOOLEAN NOT NULL DEFAULT false,
    "material" TEXT NOT NULL,
    "weight_grams" DECIMAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_elements" ("created_at", "id", "image_url", "material", "unique_name", "weight_grams") SELECT "created_at", "id", "image_url", "material", "unique_name", "weight_grams" FROM "elements";
DROP TABLE "elements";
ALTER TABLE "new_elements" RENAME TO "elements";
CREATE TABLE "new_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory" ("element_id", "id", "total_amount", "updated_at") SELECT "element_id", "id", "total_amount", "updated_at" FROM "inventory";
DROP TABLE "inventory";
ALTER TABLE "new_inventory" RENAME TO "inventory";
CREATE UNIQUE INDEX "inventory_element_id_key" ON "inventory"("element_id");
CREATE TABLE "new_inventory_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transactions_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_inventory_transactions" ("change_amount", "created_at", "element_id", "id", "reason") SELECT "change_amount", "created_at", "element_id", "id", "reason" FROM "inventory_transactions";
DROP TABLE "inventory_transactions";
ALTER TABLE "new_inventory_transactions" RENAME TO "inventory_transactions";
CREATE TABLE "new_material_requirements" (
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
INSERT INTO "new_material_requirements" ("created_at", "element_id", "id", "manufacturing_order_id", "quantity_needed", "quantity_produced", "total_weight_grams") SELECT "created_at", "element_id", "id", "manufacturing_order_id", "quantity_needed", "quantity_produced", "total_weight_grams" FROM "material_requirements";
DROP TABLE "material_requirements";
ALTER TABLE "new_material_requirements" RENAME TO "material_requirements";
CREATE UNIQUE INDEX "material_requirements_manufacturing_order_id_element_id_key" ON "material_requirements"("manufacturing_order_id", "element_id");
CREATE TABLE "new_product_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "quantity_needed" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_elements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_elements_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_product_elements" ("created_at", "element_id", "id", "product_id", "quantity_needed") SELECT "created_at", "element_id", "id", "product_id", "quantity_needed" FROM "product_elements";
DROP TABLE "product_elements";
ALTER TABLE "new_product_elements" RENAME TO "product_elements";
CREATE UNIQUE INDEX "product_elements_product_id_element_id_key" ON "product_elements"("product_id", "element_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
