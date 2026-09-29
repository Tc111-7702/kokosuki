-- ログインのステップページ化に伴う一時状態テーブル。
-- Cookie には不透明トークンのみを置き、メール(PII)はこの行に保持する（PIIをDB外に出さない）。
-- 認証コードページの案内文は保存せず、mailMode / mailRedirectTo から再生成する。
CREATE TABLE "LoginFlowPending" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'email',
    "mailMode" TEXT,
    "mailRedirectTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginFlowPending_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginFlowPending_tokenHash_key" ON "LoginFlowPending"("tokenHash");

CREATE INDEX "LoginFlowPending_expiresAt_idx" ON "LoginFlowPending"("expiresAt");
