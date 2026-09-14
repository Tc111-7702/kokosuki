import { randomInt } from 'crypto';
import * as db from '@/lib/db';
import { normalizeSignupEmail } from '@/lib/signupPending';

/** Better Auth emailOTP の expiresIn と同じ（秒） */
export const SIGN_IN_OTP_TTL_SEC = 300;

export type SignupOtpVerifyErrorCode = 'INVALID_OTP' | 'OTP_EXPIRED' | 'TOO_MANY_ATTEMPTS';

export class SignupOtpVerifyError extends Error {
  readonly code: SignupOtpVerifyErrorCode;
  readonly status: number;

  constructor(code: SignupOtpVerifyErrorCode, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function signInOtpIdentifier(email: string): string {
  return `sign-in-otp-${normalizeSignupEmail(email)}`;
}

/** 新規登録向け sign-in OTP を生成して Verification に保存する */
export async function createSignInOtpForEmail(email: string): Promise<string> {
  const identifier = signInOtpIdentifier(email);
  const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + SIGN_IN_OTP_TTL_SEC * 1000);

  await db.deleteVerificationsByIdentifier(identifier);
  await db.createVerificationRow({
    identifier,
    value: `${otp}:0`,
    expiresAt,
  });

  return otp;
}

function splitAtLastColon(input: string): [string, string] {
  const idx = input.lastIndexOf(':');
  if (idx === -1) return [input, ''];
  return [input.slice(0, idx), input.slice(idx + 1)];
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** sign-in 型 OTP を検証する（User は作成しない） */
export async function verifySignInOtp(email: string, otp: string): Promise<void> {
  const normalizedEmail = normalizeSignupEmail(email);
  const identifier = signInOtpIdentifier(normalizedEmail);
  const verificationValue = await db.findVerificationByIdentifier(identifier);

  if (!verificationValue) {
    throw new SignupOtpVerifyError('INVALID_OTP');
  }
  if (verificationValue.expiresAt < new Date()) {
    await db.deleteVerificationsByIdentifier(identifier);
    throw new SignupOtpVerifyError('OTP_EXPIRED');
  }

  const [otpValue, attempts] = splitAtLastColon(verificationValue.value);
  const allowedAttempts = 3;
  if (attempts && parseInt(attempts, 10) >= allowedAttempts) {
    await db.deleteVerificationsByIdentifier(identifier);
    throw new SignupOtpVerifyError('TOO_MANY_ATTEMPTS', 403);
  }

  await db.deleteVerificationsByIdentifier(identifier);
  if (!constantTimeEqual(otpValue, otp)) {
    await db.createVerificationRow({
      value: `${otpValue}:${parseInt(attempts || '0', 10) + 1}`,
      identifier,
      expiresAt: verificationValue.expiresAt,
    });
    throw new SignupOtpVerifyError('INVALID_OTP');
  }
}
