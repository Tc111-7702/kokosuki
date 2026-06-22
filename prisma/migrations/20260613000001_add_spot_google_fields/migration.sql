-- AlterTable
ALTER TABLE "Spot" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "Spot" ADD COLUMN "phone"         TEXT;
ALTER TABLE "Spot" ADD COLUMN "googleMapsUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Spot_googlePlaceId_key" ON "Spot"("googlePlaceId");
