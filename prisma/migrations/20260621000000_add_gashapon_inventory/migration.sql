-- AlterTable: Spot に gashaponShopCode を追加
ALTER TABLE "Spot" ADD COLUMN "gashaponShopCode" TEXT;
CREATE UNIQUE INDEX "Spot_gashaponShopCode_key" ON "Spot"("gashaponShopCode");

-- CreateTable: SpotInventory
CREATE TABLE "SpotInventory" (
    "id"          TEXT NOT NULL,
    "spotId"      TEXT NOT NULL,
    "janCode"     TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "imageUrl"    TEXT,
    "price"       INTEGER,
    "stockStatus" TEXT NOT NULL,
    "syncedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpotInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpotInventory_spotId_janCode_key" ON "SpotInventory"("spotId", "janCode");

ALTER TABLE "SpotInventory" ADD CONSTRAINT "SpotInventory_spotId_fkey"
    FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
