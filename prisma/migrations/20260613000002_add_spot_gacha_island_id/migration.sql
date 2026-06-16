-- AlterTable
ALTER TABLE "Spot" ADD COLUMN IF NOT EXISTS "gachaIslandId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Spot_gachaIslandId_key" ON "Spot"("gachaIslandId");
