-- スクレイピング予約設定を JSON ファイルから DB 管理へ移行。
-- admin が書き込み、worker が読み込む共有テーブル（type='gacha'|'phone'）。

CREATE TABLE "ScrapeSchedule" (
  "type"      TEXT NOT NULL,
  "everyDays" INTEGER NOT NULL DEFAULT 1,
  "atTime"    TEXT NOT NULL DEFAULT '03:00',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScrapeSchedule_pkey" PRIMARY KEY ("type")
);
