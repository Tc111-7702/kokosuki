-- お知らせ（Announcement）テーブル追加

CREATE TABLE "Announcement" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "body"        TEXT NOT NULL,
    "imageUrl"    TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_status_publishedAt_idx"
    ON "Announcement"("status", "publishedAt" DESC);
