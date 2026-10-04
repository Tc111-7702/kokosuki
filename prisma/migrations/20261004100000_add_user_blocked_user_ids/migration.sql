-- AlterTable: ブロックしているユーザーの ID を User に保持する。
ALTER TABLE "User" ADD COLUMN "blockedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
