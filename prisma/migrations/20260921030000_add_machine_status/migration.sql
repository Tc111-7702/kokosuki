-- Machine に可用性 status を追加（'on_sale' | 'ended'、既定 on_sale）。
-- スクレイパーが「店舗の現行入荷に無い machine」を削除する代わりに ended に更新する（ソフト削除）。
-- これにより Post/StockPost の Cascade 削除を防ぐ。既存 machine は全て on_sale になる（非破壊）。
ALTER TABLE "Machine" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'on_sale';
