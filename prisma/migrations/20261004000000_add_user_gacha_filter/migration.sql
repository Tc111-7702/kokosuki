-- AlterTable: マップ/店舗詳細のガチャフィルターを User に保持する。
ALTER TABLE "User" ADD COLUMN "gachaFilterIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 既存のハート（GachaLike）を初期フィルターにする。
UPDATE "User" u
SET "gachaFilterIds" = COALESCE(likes.ids, ARRAY[]::TEXT[])
FROM (
  SELECT "userId", array_agg(DISTINCT "gachaId") AS ids
  FROM "GachaLike"
  GROUP BY "userId"
) likes
WHERE u."id" = likes."userId";
