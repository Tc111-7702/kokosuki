-- 問い合わせ（Inquiry）テーブル追加

CREATE TABLE "Inquiry" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Inquiry_userId_createdAt_idx"
    ON "Inquiry"("userId", "createdAt" DESC);
CREATE INDEX "Inquiry_status_createdAt_idx"
    ON "Inquiry"("status", "createdAt" DESC);

ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
