-- ScrapeSchedule に実行状態カラムを追加（null許容なので既存行に影響なし）
ALTER TABLE "ScrapeSchedule" ADD COLUMN "lastRunAt" TIMESTAMP(3);
ALTER TABLE "ScrapeSchedule" ADD COLUMN "lockedAt" TIMESTAMP(3);
