-- CreateTable
CREATE TABLE "raw_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "stock_qty" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "raw_material_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raw_material_id" TEXT NOT NULL,
    "change_amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raw_material_transactions_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unique_name" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL,
    "color_2" TEXT,
    "is_dual_color" BOOLEAN NOT NULL DEFAULT false,
    "material" TEXT NOT NULL,
    "raw_material_id" TEXT,
    "weight_grams" DECIMAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "elements_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_elements" ("color", "color_2", "created_at", "id", "image_url", "is_dual_color", "label", "material", "unique_name", "weight_grams") SELECT "color", "color_2", "created_at", "id", "image_url", "is_dual_color", "label", "material", "unique_name", "weight_grams" FROM "elements";
DROP TABLE "elements";
ALTER TABLE "new_elements" RENAME TO "elements";
CREATE TABLE "new_products" (
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
INSERT INTO "new_products" ("category", "created_at", "id", "image_url", "label", "serial_number", "units_per_assembly", "units_per_box") SELECT "category", "created_at", "id", "image_url", "label", "serial_number", "units_per_assembly", "units_per_box" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_serial_number_key" ON "products"("serial_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_name_key" ON "raw_materials"("name");
