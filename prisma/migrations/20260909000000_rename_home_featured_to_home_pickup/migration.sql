-- HomeFeatured を HomePickup へリネーム（管理者が設定するホームのピックアップ枠）。
-- テーブル・制約・インデックス名を HomePickup 基準へ揃える。
ALTER TABLE "HomeFeatured" RENAME TO "HomePickup";
ALTER TABLE "HomePickup" RENAME CONSTRAINT "HomeFeatured_pkey" TO "HomePickup_pkey";
ALTER TABLE "HomePickup" RENAME CONSTRAINT "HomeFeatured_gachaId_fkey" TO "HomePickup_gachaId_fkey";
ALTER INDEX "HomeFeatured_section_gachaId_key" RENAME TO "HomePickup_section_gachaId_key";
ALTER INDEX "HomeFeatured_section_sortOrder_idx" RENAME TO "HomePickup_section_sortOrder_idx";
