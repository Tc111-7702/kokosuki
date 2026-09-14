import { NextResponse } from 'next/server';
import { finalizeMailDelivery, runWithExternalMailDelivery } from '@/lib/mailDeliveryContext';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';
import { sendOtpEmail } from '@/lib/mail';
import {
  generateSignupPendingToken,
  upsertSignupPending,
} from '@/lib/signupPending';
import { createSignInOtpForEmail } from '@/lib/signupOtpVerify';
import {
  SIGNUP_PENDING_COOKIE_NAME,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';
import * as db from '@/lib/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/signup/send-otp — 未登録メールアドレス向けに sign-in OTP を送信 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  const existing = await db.findUserIdByEmail(email);
  if (existing) {
    return NextResponse.json({ error: '既に登録されているメールアドレスです' }, { status: 400 });
  }

  try {
    const mail = await runWithExternalMailDelivery(async () => {
      const otp = await createSignInOtpForEmail(email);
      const result = await sendOtpEmail({ email, otp, type: 'sign-in' });
      finalizeMailDelivery(result);
      return result;
    });
    const token = generateSignupPendingToken();
    const expiresAt = await upsertSignupPending(email, token);
    const response = NextResponse.json({ success: true, mail, expiresAt: expiresAt.toISOString() });
    response.cookies.set(SIGNUP_PENDING_COOKIE_NAME, token, signupPendingCookieOptions());
    return response;
  } catch (e) {
    console.error('[signup send-otp]', e);
    return NextResponse.json(
      { error: formatMailSendError(e, '認証コードの送信に失敗しました') },
      { status: 500 },
    );
  }
}
