import { createHash, randomBytes } from 'crypto';
import * as db from '@/lib/db';

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

  await db.deleteQuickLoginVerificationsForUser(IDENTIFIER_PREFIX, userId);
  await db.createVerificationRow({
    identifier: quickLoginIdentifier(token),
    value: userId,
    expiresAt,
  });

  return token;
}

export async function revokeQuickLoginTokensForUser(userId: string): Promise<void> {
  await db.deleteQuickLoginVerificationsForUser(IDENTIFIER_PREFIX, userId);
}

export async function verifyQuickLoginToken(
  email: string,
  token: string,
): Promise<{ userId: string } | null> {
  const record = await db.findVerificationByIdentifier(quickLoginIdentifier(token));
  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await db.deleteVerificationById(record.id).catch(() => undefined);
    }
    return null;
  }

  const user = await db.findUserAuthById(record.value);
  if (!user || user.email.toLowerCase() !== email.trim().toLowerCase() || !user.isActive) {
    return null;
  }

  return { userId: user.id };
}
