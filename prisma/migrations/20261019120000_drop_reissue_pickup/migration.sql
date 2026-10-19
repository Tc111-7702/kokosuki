-- 再販・また引ける枠(ReissuePickup)を廃止する。
-- ホームの「再販・また引ける」は ReissuePickup テーブルを読まず、
-- 「名前に再販を含む発売中かつ未いいねのガチャをいいね順に10件」動的生成する方式へ移行した。
-- ※ 本プロジェクトのデプロイは migrate を自動実行しないため手動適用する運用。
-- ※ ReissuePickup を参照する外部キーは存在しないため単純 DROP で足りる。

DROP TABLE IF EXISTS "ReissuePickup";
