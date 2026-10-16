-- UserProfile.mapRadiusM の既定値を 20km → 5km に変更する。
-- マップの検索範囲の既定をアプリ側の既定(5km)と一致させるための修正。
-- 既存行の値は変更しない（各ユーザーの設定を尊重）。新規作成時の DB デフォルトのみ変更。
-- ※ 本プロジェクトのデプロイは migrate を自動実行しないため手動適用する運用。
ALTER TABLE "UserProfile" ALTER COLUMN "mapRadiusM" SET DEFAULT 5000;
