-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_material_requirements" (
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
INSERT INTO "new_material_requirements" ("color_id", "created_at", "element_id", "id", "manufacturing_order_id", "quantity_needed", "total_weight_grams") SELECT "color_id", "created_at", "element_id", "id", "manufacturing_order_id", "quantity_needed", "total_weight_grams" FROM "material_requirements";
DROP TABLE "material_requirements";
ALTER TABLE "new_material_requirements" RENAME TO "material_requirements";
CREATE UNIQUE INDEX "material_requirements_manufacturing_order_id_element_id_color_id_key" ON "material_requirements"("manufacturing_order_id", "element_id", "color_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
