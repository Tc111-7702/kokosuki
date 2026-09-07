-- アカウントの有効/無効（BAN・凍結）フラグを追加。既定は有効(true)。
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
