-- DropTable StockReport
DROP TABLE IF EXISTS "StockReport";

-- AlterTable Machine: drop price column, add unique constraint
ALTER TABLE "Machine" DROP COLUMN IF EXISTS "price";

-- CreateIndex: spotId + gachaId のユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS "Machine_spotId_gachaId_key" ON "Machine"("spotId", "gachaId");
