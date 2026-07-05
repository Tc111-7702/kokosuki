-- CreateTable: Follow（フォロー/フォロワー）
CREATE TABLE "Follow" (
    "id"          TEXT         NOT NULL,
    "followerId"  TEXT         NOT NULL,
    "followingId" TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 同じペアの重複防止
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- AddForeignKey: フォローする側（削除時にフォロー関係も削除）
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey"
    FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: フォローされる側（削除時にフォロー関係も削除）
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey"
    FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
