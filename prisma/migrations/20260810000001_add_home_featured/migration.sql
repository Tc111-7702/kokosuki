-- ホーム掲載枠（管理者が手動設定する掲載。今週発売 / 再販 など）
CREATE TABLE "HomeFeatured" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "gachaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeFeatured_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeFeatured_section_gachaId_key" ON "HomeFeatured"("section", "gachaId");

CREATE INDEX "HomeFeatured_section_sortOrder_idx" ON "HomeFeatured"("section", "sortOrder");

ALTER TABLE "HomeFeatured" ADD CONSTRAINT "HomeFeatured_gachaId_fkey" FOREIGN KEY ("gachaId") REFERENCES "Gacha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
