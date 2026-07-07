-- Drop favoriteIps column from UserProfile
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "favoriteIps";

-- CreateTable UserFavoriteGacha
CREATE TABLE "UserFavoriteGacha" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "gachaId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFavoriteGacha_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex
CREATE UNIQUE INDEX "UserFavoriteGacha_userId_gachaId_key" ON "UserFavoriteGacha"("userId", "gachaId");

-- AddForeignKey
ALTER TABLE "UserFavoriteGacha" ADD CONSTRAINT "UserFavoriteGacha_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFavoriteGacha" ADD CONSTRAINT "UserFavoriteGacha_gachaId_fkey"
  FOREIGN KEY ("gachaId") REFERENCES "Gacha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
