-- 通知に複数のいいね者IDを保持する配列カラムを追加（like通知の集約用）
ALTER TABLE "Notification" ADD COLUMN "actorIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
