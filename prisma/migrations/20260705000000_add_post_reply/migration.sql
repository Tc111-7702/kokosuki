-- CreateTable: PostReply（ネスト型返信）
CREATE TABLE "PostReply" (
    "id"        TEXT         NOT NULL,
    "postId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "parentId"  TEXT,
    "text"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PostReplyLike（返信いいね）
CREATE TABLE "PostReplyLike" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "replyId"   TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReplyLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 1ユーザー1返信に1いいね
CREATE UNIQUE INDEX "PostReplyLike_userId_replyId_key" ON "PostReplyLike"("userId", "replyId");

-- AddForeignKey: PostReply → Post（投稿削除時に全返信も削除）
ALTER TABLE "PostReply" ADD CONSTRAINT "PostReply_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PostReply → User（ユーザー削除時に全返信も削除）
ALTER TABLE "PostReply" ADD CONSTRAINT "PostReply_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PostReply → PostReply（自己参照。親削除時は子のparentIdをNULLにしない＝NoAction）
ALTER TABLE "PostReply" ADD CONSTRAINT "PostReply_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "PostReply"("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey: PostReplyLike → User
ALTER TABLE "PostReplyLike" ADD CONSTRAINT "PostReplyLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PostReplyLike → PostReply（返信削除時にいいねも削除）
ALTER TABLE "PostReplyLike" ADD CONSTRAINT "PostReplyLike_replyId_fkey"
    FOREIGN KEY ("replyId") REFERENCES "PostReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
