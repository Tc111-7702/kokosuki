-- signup のステップページ化に伴い、OTP 検証済みかを判定するフラグを追加。
-- 既存の未完了 pending は未検証扱い（false）。
ALTER TABLE "SignupPending" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
