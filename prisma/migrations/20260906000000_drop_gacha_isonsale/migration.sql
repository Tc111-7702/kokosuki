-- gacha: isOnSale(boolean) を廃止し status に一本化する。
-- isOnSale=true ⟺ status='on_sale' で一致しているため、列削除のみで移行できる。

DROP INDEX IF EXISTS "Gacha_isOnSale_idx";
ALTER TABLE "Gacha" DROP COLUMN "isOnSale";
CREATE INDEX "Gacha_status_idx" ON "Gacha"("status");
