-- AlterTable
ALTER TABLE "User" ADD COLUMN "birthDate" DATE;

-- AlterTable
ALTER TABLE "SignupPending" ADD COLUMN "passwordEnc" TEXT,
ADD COLUMN "name" TEXT,
ADD COLUMN "birthDate" DATE,
ADD COLUMN "handle" TEXT,
ADD COLUMN "favoriteGachaIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
