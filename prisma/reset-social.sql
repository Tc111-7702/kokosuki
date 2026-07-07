-- ============================================================
-- reset-social.sql
-- ソーシャル系テーブルを全削除してリセットする。
-- seed を再実行する前に Supabase の SQL エディタ等で実行すること。
-- ガチャ・スポット・マシンのデータは残る。
-- ============================================================

-- 返信いいね
DELETE FROM "PostReplyLike";
DELETE FROM "StockPostReply";

-- いいね
DELETE FROM "StockPostLike";
DELETE FROM "Like";

-- 返信
DELETE FROM "PostReply";

-- 投稿
DELETE FROM "StockPost";
DELETE FROM "Post";

-- Q&A
DELETE FROM "QAAnswer";
DELETE FROM "QA";

-- フォロー・お気に入りガチャ
DELETE FROM "Follow";
DELETE FROM "GachaLike";

-- ユーザープロフィールのリセット（ユーザー自体は残す）
-- 必要に応じてコメントアウトを外してください
-- DELETE FROM "UserProfile";
