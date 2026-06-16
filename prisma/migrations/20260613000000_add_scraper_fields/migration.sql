-- AlterTable
ALTER TABLE "Gacha" ADD COLUMN "imageUrl"    TEXT;
ALTER TABLE "Gacha" ADD COLUMN "releaseDate" TIMESTAMP(3);
ALTER TABLE "Gacha" ADD COLUMN "maker"       TEXT;
ALTER TABLE "Gacha" ADD COLUMN "sourceUrl"   TEXT;
ALTER TABLE "Gacha" ADD COLUMN "wpPostId"    INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Gacha_wpPostId_key" ON "Gacha"("wpPostId");
