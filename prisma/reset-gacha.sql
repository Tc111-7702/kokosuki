-- ============================================================
-- reset-gacha.sql
-- ガチャ関連データを全削除してリセットする。
-- 対象: GachaLike / Gacha / IpName / IpCategory
--
-- ※ Gacha を削除すると、これを参照する Machine / Post / StockPost
--   （および配下のいいね・返信）は FK ON DELETE CASCADE で連鎖削除される。
--   Spot は残る（再スクレイピングで upsert され、Machine/Gacha が再生成される）。
--
-- 使い方: reset-social.sql / reset-users.sql と併せて Supabase の SQL エディタ等で
--         実行し、その後に手動スクレイピング＋ seed を再実行する想定。
-- 子→親の順で明示削除する（他の reset ファイルより後に流しても冪等）。
-- ============================================================

-- ガチャいいね（Gacha 参照 / cascade 対象だが明示）
DELETE FROM "GachaLike";

-- ガチャ本体（Machine / Post / StockPost が cascade で連鎖削除される）
DELETE FROM "Gacha";

-- IP 正規化テーブル（IpName → IpCategory の順。IpName が IpCategory を RESTRICT 参照するため）
DELETE FROM "IpName";
DELETE FROM "IpCategory";
