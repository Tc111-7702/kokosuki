import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import {
  generateSignupPendingToken,
  upsertSignupPending,
} from '@/lib/signupPending';
import {
  SIGNUP_PENDING_COOKIE_NAME,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';
import { SignupOtpVerifyError, verifySignInOtp } from '@/lib/signupOtpVerify';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/signup/verify-otp — OTP 検証後 SignupPending + 30分 Cookie を発行（User は作成しない） */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();
  const otp = typeof body?.otp === 'string' ? body.otp.trim() : '';

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: 'INVALID_OTP', code: 'INVALID_OTP' }, { status: 400 });
  }

  const existing = await db.findUserIdByEmail(email);
  if (existing) {
    return NextResponse.json({ error: '既に登録されているメールアドレスです' }, { status: 400 });
  }

  try {
    await verifySignInOtp(email, otp);
    const token = generateSignupPendingToken();
    const expiresAt = await upsertSignupPending(email, token);

    const response = NextResponse.json({
      success: true,
      email,
      expiresAt: expiresAt.toISOString(),
    });
    response.cookies.set(SIGNUP_PENDING_COOKIE_NAME, token, signupPendingCookieOptions());
    return response;
  } catch (e) {
    if (e instanceof SignupOtpVerifyError) {
      return NextResponse.json({ error: e.code, code: e.code }, { status: e.status });
    }
    console.error('[signup verify-otp]', e);
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 500 });
  }
}
