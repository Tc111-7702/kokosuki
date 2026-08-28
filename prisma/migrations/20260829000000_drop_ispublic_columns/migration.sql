-- isPublic（公開/非公開フラグ）を撤去。
-- 全行 true・false を書き込む経路が無い死にフラグで、非公開機能は作らない前提。
-- Post / StockPost / SpotReview の3テーブルから削除する。
ALTER TABLE "Post" DROP COLUMN IF EXISTS "isPublic";
ALTER TABLE "StockPost" DROP COLUMN IF EXISTS "isPublic";
ALTER TABLE "SpotReview" DROP COLUMN IF EXISTS "isPublic";
