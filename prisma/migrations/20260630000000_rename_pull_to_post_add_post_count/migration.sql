-- Rename Pull table to Post
ALTER TABLE "Pull" RENAME TO "Post";

-- Rename pullId column in Like table to postId
ALTER TABLE "Like" RENAME COLUMN "pullId" TO "postId";

-- Update constraint names on Post table
ALTER TABLE "Post" RENAME CONSTRAINT "Pull_pkey" TO "Post_pkey";

-- Update foreign key constraints on Post table
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Pull_machineId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Pull_spotId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Pull_userId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Pull_gachaId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_gachaId_fkey" FOREIGN KEY ("gachaId") REFERENCES "Gacha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update foreign key on Like table
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_pullId_fkey";
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique index on Like
DROP INDEX IF EXISTS "Like_userId_pullId_key";
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");

-- Add postCount to Gacha
ALTER TABLE "Gacha" ADD COLUMN "postCount" INTEGER NOT NULL DEFAULT 0;
