-- #19 IP正規化（Expandフェーズ）: 3階層テーブル追加＋Gacha.ipNameId(nullable) FK。
-- 既存の Gacha.ipName/ipCategory(string) は温存し、Backfill→読み替え→Contract で段階移行する。

-- CreateTable
CREATE TABLE "IpCategory" (
    "id"        TEXT    NOT NULL,
    "key"       TEXT    NOT NULL,
    "name"      TEXT    NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IpCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpName" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "IpName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IpCategory_key_key" ON "IpCategory"("key");
CREATE UNIQUE INDEX "IpName_name_key"    ON "IpName"("name");
CREATE INDEX        "IpName_categoryId_idx" ON "IpName"("categoryId");

-- AlterTable（Gacha に nullable FK 列を追加）
ALTER TABLE "Gacha" ADD COLUMN "ipNameId" TEXT;
CREATE INDEX "Gacha_ipNameId_idx" ON "Gacha"("ipNameId");

-- AddForeignKey
ALTER TABLE "IpName" ADD CONSTRAINT "IpName_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "IpCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Gacha" ADD CONSTRAINT "Gacha_ipNameId_fkey"
    FOREIGN KEY ("ipNameId") REFERENCES "IpName"("id") ON DELETE SET NULL ON UPDATE CASCADE;
