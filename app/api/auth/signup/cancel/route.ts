import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cancelSignupPendingFromStep } from '@/lib/signupPending';
import type { SignupPendingCancelStep } from '@/lib/signupPendingTypes';
import {
  getSignupPendingTokenFromCookieHeader,
  SIGNUP_PENDING_COOKIE_NAME,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';

const CANCEL_STEPS: SignupPendingCancelStep[] = [
  'otp',
  'password',
  'name',
  'birthDate',
  'handle',
];

function isCancelStep(value: unknown): value is SignupPendingCancelStep {
  return typeof value === 'string' && CANCEL_STEPS.includes(value as SignupPendingCancelStep);
}

/** POST /api/auth/signup/cancel — 戻る操作で SignupPending から入力を削除 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const fromStep = body?.fromStep;
  if (!isCancelStep(fromStep)) {
    return NextResponse.json({ error: '無効なキャンセルステップです' }, { status: 400 });
  }

  const cookieHeader = (await headers()).get('cookie') ?? '';
  const token = getSignupPendingTokenFromCookieHeader(cookieHeader);

  if (fromStep === 'otp') {
    if (token) {
      await cancelSignupPendingFromStep(token, 'otp');
    }
    const response = NextResponse.json({ success: true, mode: 'cleared' });
    response.cookies.set(SIGNUP_PENDING_COOKIE_NAME, '', { ...signupPendingCookieOptions(0), maxAge: 0 });
    return response;
  }

  if (!token) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }

  const result = await cancelSignupPendingFromStep(token, fromStep);
  if (result === 'not_found') {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }

  return NextResponse.json({ success: true, mode: result });
}
