-- フォロー機能は未実装のためテーブルを削除する。
-- 環境によっては未作成のことがあるため IF EXISTS で冪等にする。
-- DropTable
DROP TABLE IF EXISTS "Follow" CASCADE;
