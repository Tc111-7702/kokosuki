-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "favoriteIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mapRadiusM" INTEGER NOT NULL DEFAULT 20000,
ADD COLUMN     "notifyFavoriteStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyReaction" BOOLEAN NOT NULL DEFAULT true;
