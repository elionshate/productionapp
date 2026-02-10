/*
  Warnings:

  - You are about to drop the column `items_per_box` on the `products` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "manufacturing_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_to_make" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "manufacturing_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "manufacturing_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturing_order_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "quantity_needed" INTEGER NOT NULL,
    "total_weight_grams" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_requirements_manufacturing_order_id_fkey" FOREIGN KEY ("manufacturing_order_id") REFERENCES "manufacturing_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_requirements_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "material_requirements_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serial_number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "units_per_assembly" INTEGER NOT NULL DEFAULT 1,
    "units_per_box" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_products" ("category", "created_at", "id", "image_url", "serial_number") SELECT "category", "created_at", "id", "image_url", "serial_number" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_serial_number_key" ON "products"("serial_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "material_requirements_manufacturing_order_id_element_id_color_id_key" ON "material_requirements"("manufacturing_order_id", "element_id", "color_id");
