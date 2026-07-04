-- AlterTable: Machine に stockStatus / stockSyncedAt を追加
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "stockStatus"   TEXT;
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "stockSyncedAt" TIMESTAMP(3);
