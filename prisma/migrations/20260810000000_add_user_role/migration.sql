-- User に権限列 role を追加（既定 'user'）。
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
