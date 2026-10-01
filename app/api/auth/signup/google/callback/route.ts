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
import { SIGNUP_GOOGLE_STATE_COOKIE } from '@/app/api/auth/signup/google/start/route';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** id_token(JWT) の payload から email を取り出す（トークンは Google から直接取得済みで信頼できる）。 */
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

/** GET /api/auth/signup/google/callback — Google からのリダイレクトを受けて分岐 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const backToSignin = new URL('/signup/signin', req.url);
  const clearState = (res: NextResponse) => {
    res.cookies.set(SIGNUP_GOOGLE_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  if (oauthError || !code || !state) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // state 照合（CSRF 対策）
  const cookieHeader = req.headers.get('cookie') ?? '';
  const stateCookie = readCookie(cookieHeader, SIGNUP_GOOGLE_STATE_COOKIE);
  if (!stateCookie || stateCookie !== state) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  if (!clientId || !clientSecret) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  // 認可コードをトークンに交換（server-to-server, client_secret 使用）
  let idToken: string | null = null;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseURL}/api/auth/signup/google/callback`,
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

  // 既存ユーザーなら better-auth でサインイン（id_token を検証し、信頼済みなら Google をリンク）。
  const signInResp = await auth.api
    .signInSocial({ body: { provider: 'google', idToken: { token: idToken } }, asResponse: true })
    .catch(() => null);

  if (!signInResp) {
    return clearState(NextResponse.redirect(backToSignin));
  }

  if (signInResp.ok) {
    // 既存ユーザー → 即時ログイン成立。sessionStorage のお気に入りを消すため client ページへ渡す。
    const res = NextResponse.redirect(new URL('/auth/google/finish', req.url));
    for (const setCookie of signInResp.headers.getSetCookie()) {
      res.headers.append('set-cookie', setCookie);
    }
    return clearState(res);
  }

  // エラー内容を確認。disableImplicitSignUp による "signup disabled" のみ「新規ユーザー」として扱う。
  const errBody = await signInResp.json().catch(() => null);
  const errCode = typeof errBody?.code === 'string' ? errBody.code : '';
  const errMessage = typeof errBody?.message === 'string' ? errBody.message : '';
  const isNewUser = errCode === 'OAUTH_LINK_ERROR' && /signup/i.test(errMessage);
  if (!isNewUser) {
    // account not linked 等、新規ではないエラー → signin に戻す。
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
    console.error('[signup google callback] otp send failed', e);
    return clearState(NextResponse.redirect(backToSignin));
  }

  const token = generateSignupPendingToken();
  await upsertSignupPending(email, token);

  const res = NextResponse.redirect(new URL('/signup/otp', req.url));
  res.cookies.set(SIGNUP_PENDING_COOKIE_NAME, token, signupPendingCookieOptions());
  return clearState(res);
}
