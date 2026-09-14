import { createHash, randomBytes } from 'crypto';
import * as db from '@/lib/db';
import { encryptSignupPendingPassword } from '@/lib/signupPendingPassword';
import { isSignupHandleFormatValid } from '@/lib/signupHandle';
import type {
  SignupPendingCancelStep,
  SignupPendingPatch,
  SignupPendingPublic,
} from '@/lib/signupPendingTypes';
import {
  getSignupPendingTokenFromCookieHeader,
  SIGNUP_PENDING_COOKIE_MAX_AGE_SEC,
} from '@/lib/signupPendingCookie';

type SignupPendingRecord = {
  email: string;
  expiresAt: Date;
  passwordEnc: string | null;
  name: string | null;
  birthDate: Date | null;
  handle: string | null;
};

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateSignupPendingToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSignupPendingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toPublicPending(record: SignupPendingRecord): SignupPendingPublic {
  return {
    email: record.email,
    expiresAt: record.expiresAt.toISOString(),
    hasPassword: !!record.passwordEnc,
    name: record.name,
    birthDate: record.birthDate
      ? record.birthDate.toISOString().slice(0, 10)
      : null,
    handle: record.handle,
  };
}

export async function deleteExpiredSignupPending(): Promise<void> {
  await db.deleteExpiredSignupPendingRows();
}

export async function upsertSignupPending(email: string, token: string): Promise<Date> {
  const normalizedEmail = normalizeSignupEmail(email);
  const tokenHash = hashSignupPendingToken(token);
  const expiresAt = new Date(Date.now() + SIGNUP_PENDING_COOKIE_MAX_AGE_SEC * 1000);

  await deleteExpiredSignupPending();
  await db.upsertSignupPendingRow({ email: normalizedEmail, tokenHash, expiresAt });

  return expiresAt;
}

async function findSignupPendingByToken(token: string): Promise<(SignupPendingRecord & { tokenHash: string }) | null> {
  const tokenHash = hashSignupPendingToken(token);
  const record = await db.findSignupPendingByTokenHash(tokenHash);
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await db.deleteSignupPendingByTokenHash(tokenHash).catch(() => undefined);
    return null;
  }
  return record;
}

export async function resolveSignupPendingPublic(token: string): Promise<SignupPendingPublic | null> {
  const record = await findSignupPendingByToken(token);
  if (!record) return null;
  return toPublicPending(record);
}

export async function clearSignupPendingByToken(token: string): Promise<void> {
  await db.deleteSignupPendingByTokenHash(hashSignupPendingToken(token));
}

export async function clearSignupPendingByEmail(email: string): Promise<void> {
  await db.deleteSignupPendingByEmail(normalizeSignupEmail(email));
}

export async function getSignupPendingPublicFromCookieHeader(
  cookieHeader: string,
): Promise<SignupPendingPublic | null> {
  const token = getSignupPendingTokenFromCookieHeader(cookieHeader);
  if (!token) return null;
  return resolveSignupPendingPublic(token);
}

function cancelPatchFromStep(fromStep: SignupPendingCancelStep) {
  switch (fromStep) {
    case 'password':
      return {
        passwordEnc: null,
        name: null,
        birthDate: null,
        handle: null,
      };
    case 'name':
      return {
        name: null,
        birthDate: null,
        handle: null,
      };
    case 'birthDate':
      return {
        birthDate: null,
        handle: null,
      };
    case 'handle':
      return {
        handle: null,
      };
    default:
      return null;
  }
}

export async function cancelSignupPendingFromStep(
  token: string,
  fromStep: SignupPendingCancelStep,
): Promise<'cleared' | 'partial' | 'not_found'> {
  if (fromStep === 'otp') {
    await clearSignupPendingByToken(token);
    return 'cleared';
  }

  const record = await findSignupPendingByToken(token);
  if (!record) return 'not_found';

  const patch = cancelPatchFromStep(fromStep);
  if (!patch) return 'not_found';

  await db.updateSignupPendingByTokenHash(record.tokenHash, patch);
  return 'partial';
}

export async function getSignupPendingRecordForComplete(
  token: string,
): Promise<(SignupPendingRecord & { tokenHash: string }) | null> {
  return findSignupPendingByToken(token);
}

export async function patchSignupPending(
  token: string,
  patch: SignupPendingPatch,
): Promise<SignupPendingPublic | null> {
  const record = await findSignupPendingByToken(token);
  if (!record) return null;

  const data: {
    passwordEnc?: string | null;
    name?: string | null;
    birthDate?: Date | null;
    handle?: string | null;
  } = {};

  if (patch.password !== undefined) {
    data.passwordEnc = patch.password
      ? await encryptSignupPendingPassword(patch.password)
      : null;
  }
  if (patch.name !== undefined) data.name = patch.name?.trim() || null;
  if (patch.handle !== undefined) {
    const normalizedHandle = patch.handle?.trim().toLowerCase() || null;
    if (normalizedHandle && !isSignupHandleFormatValid(normalizedHandle)) {
      throw new Error('INVALID_HANDLE');
    }
    data.handle = normalizedHandle;
  }
  if (patch.birthDate !== undefined) {
    if (!patch.birthDate) {
      data.birthDate = null;
    } else {
      const parsed = new Date(`${patch.birthDate}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error('INVALID_BIRTH_DATE');
      }
      data.birthDate = parsed;
    }
  }

  const updated = await db.updateSignupPendingByTokenHash(record.tokenHash, data);
  return toPublicPending(updated);
}
