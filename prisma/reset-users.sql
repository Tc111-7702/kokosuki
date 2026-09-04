-- ============================================================
-- reset-users.sql
-- ユーザー情報を全削除してリセットする。
-- seed を再実行する前に Supabase の SQL エディタ等で実行すること。
-- ガチャ・スポット・マシンのデータは残る。
-- ============================================================

-- 依存テーブルを子→親の順に削除

-- 返信いいね・返信
DELETE FROM "PostReplyLike";
DELETE FROM "StockPostReply";
DELETE FROM "PostReply";

-- いいね
DELETE FROM "StockPostLike";
DELETE FROM "Like";

-- 投稿
DELETE FROM "StockPost";
DELETE FROM "Post";

-- Q&A
DELETE FROM "QAAnswer";
DELETE FROM "QA";

-- ガチャいいね（お気に入り）
DELETE FROM "GachaLike";

-- 口コミ
DELETE FROM "SpotReviewLike";
DELETE FROM "SpotReviewReply";
DELETE FROM "SpotReview";

-- 通知
DELETE FROM "Notification";

-- プロフィール
DELETE FROM "UserProfile";

-- 認証情報
DELETE FROM "Session";
DELETE FROM "Account";

-- ユーザー本体（cascade で残りも削除）
DELETE FROM "User";
