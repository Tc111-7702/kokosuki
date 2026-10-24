import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { finalizeMailDelivery, runWithExternalMailDelivery } from '@/lib/mailDeliveryContext';
import { sendOtpEmail } from '@/lib/mail';
import { generateSignupPendingToken, upsertSignupPending } from '@/lib/signupPending';
import { createSignInOtpForEmail } from '@/lib/signupOtpVerify';
import {
  SIGNUP_PENDING_COOKIE_NAME,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';
import { SIGNUP_APPLE_STATE_COOKIE } from '@/app/api/auth/signup/apple/start/route';
import { getAppleClientSecret } from '@/lib/appleClientSecret';

const TOKEN_URL = 'https://appleid.apple.com/auth/token';

function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** id_token(JWT) の payload から email を取り出す（トークンは Apple から直接取得済みで信頼できる）。 */
function decodeIdTokenEmail(idToken: string): { email: string | null; emailVerified: boolean } {
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const email = typeof json.email === 'string' ? json.email.toLowerCase() : null;
    const emailVerified = json.email_verified === true || json.email_verified === 'true';
    return { email, emailVerified };
  } catch {
    return { email: null, emailVerified: false };
  }
}

/** POST /api/auth/signup/apple/callback — Apple からの form_post を受けて分岐 */
export async function POST(req: Request) {
  const backToSignin = new URL('/signup/signin', req.url);
  // state の破棄は生の Set-Cookie で行う（NextResponse の再シリアライズでセッションCookieが落ちるため）。
  const clearState = (res: NextResponse) => {
    res.headers.append(
      'set-cookie',
      `${SIGNUP_APPLE_STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`,
    );
    return res;
  };

  // Apple は application/x-www-form-urlencoded で code/state(/user) を POST してくる。
  const form = await req.formData().catch(() => null);
  const code = form ? (form.get('code') as string | null) : null;
  const state = form ? (form.get('state') as string | null) : null;
  const oauthError = form ? (form.get('error') as string | null) : null;

  if (oauthError || !code || !state) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // state 照合（CSRF 対策）
  const cookieHeader = req.headers.get('cookie') ?? '';
  const stateCookie = readCookie(cookieHeader, SIGNUP_APPLE_STATE_COOKIE);
  if (!stateCookie || stateCookie !== state) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  const clientId = process.env.APPLE_CLIENT_ID;
  const clientSecret = getAppleClientSecret();
  const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  if (!clientId || !clientSecret) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // 認可コードをトークンに交換（server-to-server, client_secret=署名JWT 使用）
  let idToken: string | null = null;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseURL}/api/auth/signup/apple/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json().catch(() => null);
    idToken = typeof tokenData?.id_token === 'string' ? tokenData.id_token : null;
  } catch {
    idToken = null;
  }
  if (!idToken) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // 既存ユーザーなら better-auth でサインイン（id_token を検証し、信頼済みなら Apple をリンク）。
  const signInResp = await auth.api
    .signInSocial({ body: { provider: 'apple', idToken: { token: idToken } }, asResponse: true })
    .catch(() => null);

  if (!signInResp) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  if (signInResp.ok) {
    // 既存ユーザー → 即時ログイン成立。sessionStorage のお気に入りを消すため finish ページへ。
    const res = NextResponse.redirect(new URL('/auth/apple/finish', req.url));
    for (const setCookie of signInResp.headers.getSetCookie()) {
      res.headers.append('set-cookie', setCookie);
    }
    return clearState(res);
  }

  // disableImplicitSignUp による "signup disabled" のみ「新規ユーザー」として扱う。
  const errBody = await signInResp.json().catch(() => null);
  const errCode = typeof errBody?.code === 'string' ? errBody.code : '';
  const errMessage = typeof errBody?.message === 'string' ? errBody.message : '';
  const isNewUser = errCode === 'OAUTH_LINK_ERROR' && /signup/i.test(errMessage);
  if (!isNewUser) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  const { email, emailVerified } = decodeIdTokenEmail(idToken);
  if (!email || !emailVerified) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // 念のため二重チェック（既存なら上の signInSocial でログインしているはず）。
  const existing = await db.findUserIdByEmail(email);
  if (existing) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // 未登録 → OTP 送信 + SignupPending 作成（/api/auth/signup/send-otp と同じ処理）。
  try {
    await runWithExternalMailDelivery(async () => {
      const otp = await createSignInOtpForEmail(email);
      const result = await sendOtpEmail({ email, otp, type: 'sign-in' });
      finalizeMailDelivery(result);
      return result;
    });
  } catch (e) {
    console.error('[signup apple callback] otp send failed', e);
    return clearState(NextResponse.redirect(backToSignin));
  }

  const token = generateSignupPendingToken();
  await upsertSignupPending(email, token);

  const res = NextResponse.redirect(new URL('/signup/otp', req.url));
  res.cookies.set(SIGNUP_PENDING_COOKIE_NAME, token, signupPendingCookieOptions());
  return clearState(res);
}
