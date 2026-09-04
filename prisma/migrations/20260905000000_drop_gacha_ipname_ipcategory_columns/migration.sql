-- #19 Contract: 旧 ipName / ipCategory(string) 列を削除する。
-- 前提: 事前に `npx tsx scripts/link-ip.ts`（またはスクレイパー）で全既存ガチャの
--       ipNameId が link 済みであること。link 前に実行すると ipName 情報が失われる。
-- ipNameId は除外ガチャ(ジャンル名/不明)が null を持つため NOT NULL 化しない。

ALTER TABLE "Gacha" DROP COLUMN "ipName";
ALTER TABLE "Gacha" DROP COLUMN "ipCategory";
