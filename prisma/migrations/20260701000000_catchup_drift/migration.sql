-- catch-up: db push で適用済みの変更をマイグレーション履歴に記録
DROP TABLE IF EXISTS "SpotInventory";
ALTER TABLE "Spot" DROP COLUMN IF EXISTS "gashaponShopCode";
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "handle" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_handle_key" ON "UserProfile"("handle");
