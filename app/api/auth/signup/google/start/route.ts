import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// 新規登録: Google のアカウント選択ページへリダイレクトする（ログインと同じ全画面リダイレクト）。
// リダイレクト先は better-auth ではなく自前の callback にして、戻ってきたコードから
// メールアドレスを取り出し「既存→ログイン / 未登録→OTP」を分岐する。
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const SIGNUP_GOOGLE_STATE_COOKIE = 'signup_google_state';

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/signup/signin', req.url));
  }

  const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  const state = randomBytes(32).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseURL}/api/auth/signup/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  // CSRF 対策の state を HttpOnly Cookie に保存し、callback で照合する。
  res.cookies.set(SIGNUP_GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
