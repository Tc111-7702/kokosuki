-- CreateTable
CREATE TABLE "SignupPending" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupPending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupPending_email_key" ON "SignupPending"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SignupPending_tokenHash_key" ON "SignupPending"("tokenHash");

-- CreateIndex
CREATE INDEX "SignupPending_expiresAt_idx" ON "SignupPending"("expiresAt");
