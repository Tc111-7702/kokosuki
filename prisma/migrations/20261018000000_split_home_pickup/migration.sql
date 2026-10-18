-- 旧 HomePickup（section で「今週発売/再販」を兼ねた1テーブル）を用途別テーブルに分割する。
-- 今週発売(WeeklyPickup)はガチャ詳細のカスタム表示用に、発売通知の購読と「楽しみの声」を持つ。
-- ※ 本プロジェクトのデプロイは migrate を自動実行しないため手動適用する運用。

-- 再販・また引ける
CREATE TABLE "ReissuePickup" (
    "id" TEXT NOT NULL,
    "gachaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReissuePickup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReissuePickup_gachaId_key" ON "ReissuePickup"("gachaId");
CREATE INDEX "ReissuePickup_sortOrder_idx" ON "ReissuePickup"("sortOrder");
ALTER TABLE "ReissuePickup" ADD CONSTRAINT "ReissuePickup_gachaId_fkey"
  FOREIGN KEY ("gachaId") REFERENCES "Gacha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 今週発売
CREATE TABLE "WeeklyPickup" (
    "id" TEXT NOT NULL,
    "gachaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyPickup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WeeklyPickup_gachaId_key" ON "WeeklyPickup"("gachaId");
CREATE INDEX "WeeklyPickup_sortOrder_idx" ON "WeeklyPickup"("sortOrder");
ALTER TABLE "WeeklyPickup" ADD CONSTRAINT "WeeklyPickup_gachaId_fkey"
  FOREIGN KEY ("gachaId") REFERENCES "Gacha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 発売開始を通知してほしいユーザー（WeeklyPickup 削除で cascade 削除）
CREATE TABLE "WeeklyReleaseNotify" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyReleaseNotify_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WeeklyReleaseNotify_pickupId_userId_key" ON "WeeklyReleaseNotify"("pickupId", "userId");
CREATE INDEX "WeeklyReleaseNotify_pickupId_idx" ON "WeeklyReleaseNotify"("pickupId");
ALTER TABLE "WeeklyReleaseNotify" ADD CONSTRAINT "WeeklyReleaseNotify_pickupId_fkey"
  FOREIGN KEY ("pickupId") REFERENCES "WeeklyPickup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 楽しみの声（1ユーザー何回でも／いいね・返信なし。WeeklyPickup 削除で cascade 削除）
CREATE TABLE "WeeklyVoice" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyVoice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WeeklyVoice_pickupId_createdAt_idx" ON "WeeklyVoice"("pickupId", "createdAt");
ALTER TABLE "WeeklyVoice" ADD CONSTRAINT "WeeklyVoice_pickupId_fkey"
  FOREIGN KEY ("pickupId") REFERENCES "WeeklyPickup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 既存データ移行（section ごとに振り分け。id/sortOrder/createdAt はそのまま引き継ぐ）
INSERT INTO "ReissuePickup" ("id", "gachaId", "sortOrder", "createdAt")
  SELECT "id", "gachaId", "sortOrder", "createdAt" FROM "HomePickup" WHERE "section" = 'reissue';
INSERT INTO "WeeklyPickup" ("id", "gachaId", "sortOrder", "createdAt")
  SELECT "id", "gachaId", "sortOrder", "createdAt" FROM "HomePickup" WHERE "section" = 'weekly';

-- 旧テーブル削除
DROP TABLE "HomePickup";
