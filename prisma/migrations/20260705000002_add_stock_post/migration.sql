-- CreateTable
CREATE TABLE "StockPost" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "gachaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockStatus" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPostLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockPostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPostReply" (
    "id" TEXT NOT NULL,
    "stockPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockPostReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockPostLike_userId_stockPostId_key" ON "StockPostLike"("userId", "stockPostId");

-- AddForeignKey
ALTER TABLE "StockPost" ADD CONSTRAINT "StockPost_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockPost" ADD CONSTRAINT "StockPost_spotId_fkey"    FOREIGN KEY ("spotId")    REFERENCES "Spot"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockPost" ADD CONSTRAINT "StockPost_gachaId_fkey"   FOREIGN KEY ("gachaId")   REFERENCES "Gacha"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockPost" ADD CONSTRAINT "StockPost_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockPostLike" ADD CONSTRAINT "StockPostLike_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id")      ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockPostLike" ADD CONSTRAINT "StockPostLike_stockPostId_fkey" FOREIGN KEY ("stockPostId") REFERENCES "StockPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockPostReply" ADD CONSTRAINT "StockPostReply_stockPostId_fkey" FOREIGN KEY ("stockPostId") REFERENCES "StockPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockPostReply" ADD CONSTRAINT "StockPostReply_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id")      ON DELETE CASCADE ON UPDATE CASCADE;
