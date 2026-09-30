import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { touchSignupPending } from '@/lib/signupPending';
import {
  SIGNUP_PENDING_COOKIE_NAME,
  getSignupPendingTokenFromCookieHeader,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';

/**
 * POST /api/auth/signup/touch — 各signupページの mount で叩く。
 * token が有効なら expiresAt を延長＋Cookieの maxAge を張り直し、最新の公開情報を返す。
 * 無効（未作成/期限切れ）なら 401。RSC では Cookie を書けないためこの Route Handler で行う。
 */
export async function POST() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const token = getSignupPendingTokenFromCookieHeader(cookieHeader);
  if (!token) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }
  const result = await touchSignupPending(token);
  if (!result) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }
  const res = NextResponse.json(result.public);
  // token（Cookie値）は据え置きで maxAge だけ延長（スライド式）。
  res.cookies.set(SIGNUP_PENDING_COOKIE_NAME, token, signupPendingCookieOptions());
  return res;
}
