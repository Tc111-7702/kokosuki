-- WeeklyReleaseNotify は gachaLike(いいね) と完全に同義で不要になったため削除する。
-- 発売通知の購読状態は GachaLike を参照する（別テーブルで持たない）。
-- ※ 本プロジェクトのデプロイは migrate を自動実行しないため手動適用する運用。
DROP TABLE IF EXISTS "WeeklyReleaseNotify";
