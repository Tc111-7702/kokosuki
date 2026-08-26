-- 使われていない Gacha カラムを削除
ALTER TABLE "Gacha" DROP COLUMN IF EXISTS "kind";
ALTER TABLE "Gacha" DROP COLUMN IF EXISTS "startWeekLabel";
ALTER TABLE "Gacha" DROP COLUMN IF EXISTS "isCollab";
ALTER TABLE "Gacha" DROP COLUMN IF EXISTS "isContinuation";
ALTER TABLE "Gacha" DROP COLUMN IF EXISTS "commentCount";
ALTER TABLE "Gacha" DROP COLUMN IF EXISTS "weeklyPulls";
