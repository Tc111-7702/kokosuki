import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// 新規登録: Apple のサインインページへリダイレクトする（Google と同じ全画面リダイレクト）。
// 戻りは自前 callback にして、id_token から email を取り出し「既存→ログイン / 未登録→OTP」を分岐する。
const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
export const SIGNUP_APPLE_STATE_COOKIE = 'signup_apple_state';

export async function GET(req: Request) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/signup/signin', req.url));
  }

  const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  const state = randomBytes(32).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseURL}/api/auth/signup/apple/callback`,
    response_type: 'code',
    scope: 'name email',
    // email/name スコープ要求時は response_mode=form_post 必須（Apple が POST で戻す）。
    response_mode: 'form_post',
    state,
  });

  const res = NextResponse.redirect(`${APPLE_AUTH_URL}?${params.toString()}`);
  // Apple は別オリジンから form_post でPOSTしてくるため、state Cookie は SameSite=None 必須。
  // SameSite=None には Secure が必須（Apple認証は https 前提なので常に Secure）。
  res.cookies.set(SIGNUP_APPLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 600,
  });
  return res;
}
