import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { clearRateLimit, getRateLimitStatus, registerRateLimitFailure } from '@/lib/rateLimit';
import {
  LOGIN_PASSWORD_RATE_LIMIT,
  LOGIN_PASSWORD_RATE_LIMIT_ERROR,
  loginPasswordRateKey,
} from '@/lib/loginPasswordRateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/login/password — パスワードログイン。
 * メールアドレス（アカウント）単位でパスワード誤入力をサーバー側に記録し、5回で15分ロックする。
 * ロック中はサインイン試行自体をさせない。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !EMAIL_RE.test(email) || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
  }

  const key = loginPasswordRateKey(email);
  if ((await getRateLimitStatus(key)).locked) {
    return NextResponse.json({ error: LOGIN_PASSWORD_RATE_LIMIT_ERROR, locked: true }, { status: 429 });
  }

  const signInResp = await auth.api
    .signInEmail({ body: { email, password }, headers: await headers(), asResponse: true })
    .catch(() => null);

  if (!signInResp) {
    return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 });
  }

  if (signInResp.ok) {
    // 成功 → カウントをリセットし、セッション Cookie を転送する。
    await clearRateLimit(key);
    const res = NextResponse.json({ ok: true });
    for (const setCookie of signInResp.headers.getSetCookie()) {
      res.headers.append('set-cookie', setCookie);
    }
    return res;
  }

  const data = await signInResp.json().catch(() => null);
  const code = typeof data?.code === 'string' ? data.code : '';
  const message = typeof data?.message === 'string' ? data.message : '';
  const wrongPassword =
    code === 'INVALID_EMAIL_OR_PASSWORD' || /invalid email or password|invalid password/i.test(message);

  if (wrongPassword) {
    // パスワード不一致のみ誤入力として記録。到達したらロックして 429 を返す。
    const rl = await registerRateLimitFailure(key, LOGIN_PASSWORD_RATE_LIMIT);
    if (rl.locked) {
      return NextResponse.json({ error: LOGIN_PASSWORD_RATE_LIMIT_ERROR, locked: true }, { status: 429 });
    }
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 });
  }

  // その他のエラー（無効化アカウント等）はそのまま返す。
  return NextResponse.json(
    { error: message || 'ログインに失敗しました' },
    { status: signInResp.status },
  );
}
