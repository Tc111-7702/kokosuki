-- アバターを User.image に一本化し、UserProfile.avatarUrl を廃止する。
-- 念のため、User.image が未設定で UserProfile.avatarUrl が設定済みのユーザーは image に退避してから列を削除する。
UPDATE "User" u
SET "image" = p."avatarUrl"
FROM "UserProfile" p
WHERE p."userId" = u."id"
  AND u."image" IS NULL
  AND p."avatarUrl" IS NOT NULL;

ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "avatarUrl";
