-- CreateTable
CREATE TABLE "SpotReview" (
    "id"        TEXT NOT NULL,
    "spotId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "text"      TEXT NOT NULL,
    "isPublic"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotReviewReply" (
    "id"        TEXT NOT NULL,
    "reviewId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "text"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotReviewReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotReviewLike" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,

    CONSTRAINT "SpotReviewLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpotReview_spotId_idx"        ON "SpotReview"("spotId");
CREATE INDEX "SpotReview_userId_idx"        ON "SpotReview"("userId");
CREATE INDEX "SpotReviewReply_reviewId_idx" ON "SpotReviewReply"("reviewId");
CREATE UNIQUE INDEX "SpotReviewLike_userId_reviewId_key" ON "SpotReviewLike"("userId", "reviewId");

-- AddForeignKey
ALTER TABLE "SpotReview" ADD CONSTRAINT "SpotReview_spotId_fkey"
    FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotReview" ADD CONSTRAINT "SpotReview_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpotReviewReply" ADD CONSTRAINT "SpotReviewReply_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "SpotReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotReviewReply" ADD CONSTRAINT "SpotReviewReply_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpotReviewLike" ADD CONSTRAINT "SpotReviewLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotReviewLike" ADD CONSTRAINT "SpotReviewLike_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "SpotReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
