import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { LOGIN_FLOW_COOKIE_NAME, loginFlowCookieOptions } from '@/lib/loginFlowCookie';
import { createLoginFlowPending, normalizeLoginFlowProvider } from '@/lib/loginFlowPending';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/login/verify-email — 登録済みユーザーのみパスワードログインへ進める */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();
  const provider = normalizeLoginFlowProvider(body?.provider);

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  const user = await db.findUserAuthByEmail(email);
  if (!user) {
    return NextResponse.json({ error: '登録されていないメールアドレスです' }, { status: 400 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: 'このアカウントは無効化されています。' }, { status: 400 });
  }

  // パスワード入力ページ(/login/password)への遷移を許可する一時状態を発行。
  // メール(PII)は DB に保持し、Cookie には不透明トークンのみを載せる。
  const token = await createLoginFlowPending({ email, step: 'password', provider });
  const res = NextResponse.json({ success: true });
  res.cookies.set(LOGIN_FLOW_COOKIE_NAME, token, loginFlowCookieOptions());
  return res;
}
