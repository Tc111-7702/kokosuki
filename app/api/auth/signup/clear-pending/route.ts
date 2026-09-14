import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cancelSignupPendingFromStep } from '@/lib/signupPending';
import {
  getSignupPendingTokenFromCookieHeader,
  SIGNUP_PENDING_COOKIE_NAME,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';

/** POST /api/auth/signup/clear-pending — SignupPending と Cookie を完全削除（otp 戻ると同等） */
export async function POST() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const token = getSignupPendingTokenFromCookieHeader(cookieHeader);
  if (token) {
    await cancelSignupPendingFromStep(token, 'otp');
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SIGNUP_PENDING_COOKIE_NAME, '', { ...signupPendingCookieOptions(0), maxAge: 0 });
  return response;
}
