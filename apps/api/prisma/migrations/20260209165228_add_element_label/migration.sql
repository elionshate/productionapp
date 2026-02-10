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
    "weight_grams" DECIMAL NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_elements" ("color", "color_2", "created_at", "id", "image_url", "is_dual_color", "material", "unique_name", "weight_grams") SELECT "color", "color_2", "created_at", "id", "image_url", "is_dual_color", "material", "unique_name", "weight_grams" FROM "elements";
DROP TABLE "elements";
ALTER TABLE "new_elements" RENAME TO "elements";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
