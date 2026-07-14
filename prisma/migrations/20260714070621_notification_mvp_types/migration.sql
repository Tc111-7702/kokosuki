-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "postId" TEXT,
ADD COLUMN     "spotId" TEXT,
ADD COLUMN     "spotReviewId" TEXT,
ADD COLUMN     "stockPostId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
