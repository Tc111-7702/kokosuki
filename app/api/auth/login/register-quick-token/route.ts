import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  normalizeLoginEmail,
  quickLoginCookieName,
  quickLoginCookieOptions,
} from '@/lib/quickLoginCookie';
import { registerQuickLoginToken } from '@/lib/quickLoginToken';

/** POST /api/auth/login/register-quick-token — 即ログイン用トークンを HttpOnly cookie に保存 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = normalizeLoginEmail(session.user.email);
  const token = await registerQuickLoginToken(session.user.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set(quickLoginCookieName(email), token, quickLoginCookieOptions());
  return res;
}
