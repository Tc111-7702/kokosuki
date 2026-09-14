import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

const IDENTIFIER_PREFIX = 'mikke-quick-login:';
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1年

export function generateQuickLoginToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashQuickLoginToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function quickLoginIdentifier(token: string): string {
  return `${IDENTIFIER_PREFIX}${hashQuickLoginToken(token)}`;
}

export async function registerQuickLoginToken(userId: string): Promise<string> {
  const token = generateQuickLoginToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: IDENTIFIER_PREFIX },
      value: userId,
    },
  });

  await prisma.verification.create({
    data: {
      identifier: quickLoginIdentifier(token),
      value: userId,
      expiresAt,
    },
  });

  return token;
}

export async function revokeQuickLoginTokensForUser(userId: string): Promise<void> {
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: IDENTIFIER_PREFIX },
      value: userId,
    },
  });
}

export async function verifyQuickLoginToken(
  email: string,
  token: string,
): Promise<{ userId: string } | null> {
  const record = await prisma.verification.findFirst({
    where: { identifier: quickLoginIdentifier(token) },
  });
  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.verification.delete({ where: { id: record.id } }).catch(() => undefined);
    }
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: record.value },
    select: { id: true, email: true, isActive: true },
  });
  if (!user || user.email.toLowerCase() !== email.trim().toLowerCase() || !user.isActive) {
    return null;
  }

  return { userId: user.id };
}
