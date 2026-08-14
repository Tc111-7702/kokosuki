-- 認可用の role 列を User に追加（既存ユーザーは 'user'）
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
