-- 予約設定を廃止し、ScrapeSchedule を type + lastRunAt のみに縮小する。
-- 実行時刻は GitHub Actions cron + コード定数(SCRAPE_TIMES)で固定管理するため不要。
ALTER TABLE "ScrapeSchedule" DROP COLUMN IF EXISTS "everyDays";
ALTER TABLE "ScrapeSchedule" DROP COLUMN IF EXISTS "atTime";
ALTER TABLE "ScrapeSchedule" DROP COLUMN IF EXISTS "lockedAt";
ALTER TABLE "ScrapeSchedule" DROP COLUMN IF EXISTS "updatedAt";
