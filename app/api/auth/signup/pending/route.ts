import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  getSignupPendingPublicFromCookieHeader,
  patchSignupPending,
} from '@/lib/signupPending';
import { validatePasswordPolicy } from '@/lib/passwordPolicy';
import { HANDLE_FORMAT_ERROR } from '@/lib/signupHandle';
import type { SignupPendingPatch } from '@/lib/signupPendingTypes';
import { getSignupPendingTokenFromCookieHeader } from '@/lib/signupPendingCookie';

/** GET /api/auth/signup/pending — Cookie に紐づく SignupPending を返す */
export async function GET() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const pending = await getSignupPendingPublicFromCookieHeader(cookieHeader);
  if (!pending) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }
  return NextResponse.json(pending);
}

/** PATCH /api/auth/signup/pending — SignupPending の各項目を保存 */
export async function PATCH(req: Request) {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const token = getSignupPendingTokenFromCookieHeader(cookieHeader);
  if (!token) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as SignupPendingPatch | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 });
  }

  if (typeof body.password === 'string') {
    const policyError = validatePasswordPolicy(body.password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }
  }

  try {
    const pending = await patchSignupPending(token, body);
    if (!pending) {
      return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
    }
    return NextResponse.json(pending);
  } catch (e) {
    if (e instanceof Error && e.message === 'INVALID_BIRTH_DATE') {
      return NextResponse.json({ error: '生年月日の形式が正しくありません' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'INVALID_HANDLE') {
      return NextResponse.json({ error: HANDLE_FORMAT_ERROR }, { status: 400 });
    }
    console.error('[signup pending PATCH]', e);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
