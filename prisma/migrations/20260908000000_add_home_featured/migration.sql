-- ホーム掲載枠テーブル（admin と共有）を mikke のマイグレーション管理下に置く。
-- このテーブルは元々 admin の prisma/home-featured.sql（seed が実行）で作成されていたため、
-- 既存DBでも壊れないよう IF NOT EXISTS で冪等に定義する（新規DBではここで作成される）。

CREATE TABLE IF NOT EXISTS "HomeFeatured" (
  "id"        TEXT NOT NULL,
  "section"   TEXT NOT NULL,
  "gachaId"   TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeFeatured_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeFeatured_section_gachaId_key" ON "HomeFeatured"("section", "gachaId");
CREATE INDEX IF NOT EXISTS "HomeFeatured_section_sortOrder_idx" ON "HomeFeatured"("section", "sortOrder");

-- 外部キー（既存DBでは既に存在する場合があるため、無ければ追加する）。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HomeFeatured_gachaId_fkey'
  ) THEN
    ALTER TABLE "HomeFeatured"
      ADD CONSTRAINT "HomeFeatured_gachaId_fkey"
      FOREIGN KEY ("gachaId") REFERENCES "Gacha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
