-- 通知許可（opt-out）機能を廃止し、通知は常に送る方針に統一。
-- UserProfile の通知設定カラムを削除する。既存の false 設定は「常に通知」に集約される。
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "notifyFavoriteStock";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "notifyReaction";
