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
  // Apple は form_post で POST してくるため、ページへのリダイレクトは 303(See Other) を使う。
  // 既定の 307 はメソッドを保持するため、リダイレクト先ページに再度 POST され 405 になる。
  const redirectToPage = (url: URL) => NextResponse.redirect(url, 303);
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
    console.log('[apple signup cb] 1 missing params', { oauthError, hasCode: !!code, hasState: !!state });
    return clearState(redirectToPage(backToSignin));
  }

  // state 照合（CSRF 対策）
  const cookieHeader = req.headers.get('cookie') ?? '';
  const stateCookie = readCookie(cookieHeader, SIGNUP_APPLE_STATE_COOKIE);
  if (!stateCookie || stateCookie !== state) {
    console.log('[apple signup cb] 2 state mismatch', { cookiePresent: !!stateCookie, match: stateCookie === state });
    return clearState(redirectToPage(backToSignin));
  }

  const clientId = process.env.APPLE_CLIENT_ID;
  const clientSecret = getAppleClientSecret();
  const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  if (!clientId || !clientSecret) {
    console.log('[apple signup cb] 3 missing client config', { hasClientId: !!clientId, hasClientSecret: !!clientSecret });
    return clearState(redirectToPage(backToSignin));
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
    // 鍵・redirect_uri の不一致はここで error(invalid_client / invalid_grant 等)として出る。
    console.log('[apple signup cb] 4 token exchange', {
      status: tokenRes.status,
      hasIdToken: !!idToken,
      error: tokenData?.error,
      errorDescription: tokenData?.error_description,
      redirectUriUsed: `${baseURL}/api/auth/signup/apple/callback`,
    });
  } catch (e) {
    console.error('[apple signup cb] 4 token exchange threw', e);
    idToken = null;
  }
  if (!idToken) {
    return clearState(redirectToPage(backToSignin));
  }

  // 既存ユーザーなら better-auth でサインイン（id_token を検証し、信頼済みなら Apple をリンク）。
  const signInResp = await auth.api
    .signInSocial({ body: { provider: 'apple', idToken: { token: idToken } }, asResponse: true })
    .catch((e) => {
      console.error('[apple signup cb] 5 signInSocial threw', e);
      return null;
    });

  if (!signInResp) {
    return clearState(redirectToPage(backToSignin));
  }

  if (signInResp.ok) {
    // 既存ユーザー → 即時ログイン成立。sessionStorage のお気に入りを消すため finish ページへ。
    console.log('[apple signup cb] 6 existing user -> login');
    const res = redirectToPage(new URL('/auth/apple/finish', req.url));
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
  console.log('[apple signup cb] 7 signInSocial not ok', { status: signInResp.status, errCode, errMessage, isNewUser });
  if (!isNewUser) {
    return clearState(redirectToPage(backToSignin));
  }

  const { email, emailVerified } = decodeIdTokenEmail(idToken);
  console.log('[apple signup cb] 8 decoded email', { hasEmail: !!email, emailVerified });
  if (!email || !emailVerified) {
    return clearState(redirectToPage(backToSignin));
  }

  // 念のため二重チェック（既存なら上の signInSocial でログインしているはず）。
  const existing = await db.findUserIdByEmail(email);
  if (existing) {
    console.log('[apple signup cb] 9 existing on double-check -> signin');
    return clearState(redirectToPage(backToSignin));
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
    return clearState(redirectToPage(backToSignin));
  }

  const token = generateSignupPendingToken();
  await upsertSignupPending(email, token);

  console.log('[apple signup cb] 10 new user -> otp sent -> /signup/otp');
  const res = redirectToPage(new URL('/signup/otp', req.url));
  res.cookies.set(SIGNUP_PENDING_COOKIE_NAME, token, signupPendingCookieOptions());
  return clearState(res);
}
