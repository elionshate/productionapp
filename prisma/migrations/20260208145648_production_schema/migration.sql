/*
  Warnings:

  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "settings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "color_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unique_name" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "weight_grams" DECIMAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serial_number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "items_per_box" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "product_elements" (
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

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "stock_boxed_amount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "element_id" TEXT,
    "color_id" TEXT,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_transactions_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_transactions_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "boxes_needed" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "colors_color_name_key" ON "colors"("color_name");

-- CreateIndex
CREATE UNIQUE INDEX "products_serial_number_key" ON "products"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "product_elements_product_id_element_id_color_id_key" ON "product_elements"("product_id", "element_id", "color_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_element_id_color_id_key" ON "inventory"("element_id", "color_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_stock_product_id_key" ON "product_stock"("product_id");
