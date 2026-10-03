import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { runWithMailDeliveryContext } from '@/lib/mailDeliveryContext';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';
import { LOGIN_FLOW_COOKIE_NAME, loginFlowCookieOptions } from '@/lib/loginFlowCookie';
import { createLoginFlowPending, normalizeLoginFlowProvider } from '@/lib/loginFlowPending';
import {
  LOGIN_EMAIL_RATE_LIMIT,
  LOGIN_EMAIL_RATE_LIMIT_ERROR,
  loginEmailRateKey,
} from '@/lib/loginEmailRateLimit';
import { getClientIp, getRateLimitStatus, registerRateLimitFailure } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/login/send-otp — 登録済みユーザーのみ sign-in OTP を送信 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();
  const provider = normalizeLoginFlowProvider(body?.provider);

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  // IP単位のレート制限（enumeration 抑止）。ロック中は試行させない。
  const rlKey = loginEmailRateKey(getClientIp(req.headers));
  if ((await getRateLimitStatus(rlKey)).locked) {
    return NextResponse.json({ error: LOGIN_EMAIL_RATE_LIMIT_ERROR }, { status: 429 });
  }

  const user = await db.findUserAuthByEmail(email);
  if (!user) {
    // 未登録メールの連続試行を記録。到達でロックしたら 429 を返す。
    const rl = await registerRateLimitFailure(rlKey, LOGIN_EMAIL_RATE_LIMIT);
    if (rl.locked) {
      return NextResponse.json({ error: LOGIN_EMAIL_RATE_LIMIT_ERROR }, { status: 429 });
    }
    return NextResponse.json({ error: '登録されていないメールアドレスです' }, { status: 400 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: 'このアカウントは無効化されています。' }, { status: 400 });
  }

  try {
    const headersList = await headers();
    const { mail } = await runWithMailDeliveryContext(async () => {
      await auth.api.sendVerificationOTP({
        body: { email, type: 'sign-in' },
        headers: headersList,
      });
    });
    // 認証コード入力ページ(/login/otp)への遷移を許可する一時状態を発行。
    // メール(PII)は DB に保持し、Cookie には不透明トークンのみを載せる。
    // 案内文は保存せず、mailMode/mailRedirectTo から OTP ページで再生成する。
    const token = await createLoginFlowPending({
      email,
      step: 'otp',
      provider,
      mailMode: mail?.mode ?? null,
      mailRedirectTo: mail?.devRedirectTo ?? null,
    });
    const res = NextResponse.json({ success: true, mail });
    res.cookies.set(LOGIN_FLOW_COOKIE_NAME, token, loginFlowCookieOptions());
    return res;
  } catch (e) {
    console.error('[login send-otp]', e);
    return NextResponse.json(
      { error: formatMailSendError(e, '認証コードの送信に失敗しました') },
      { status: 500 },
    );
  }
}
