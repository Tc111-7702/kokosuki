import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  normalizeLoginEmail,
  quickLoginCookieName,
  quickLoginCookieOptions,
} from '@/lib/quickLoginCookie';
import { revokeQuickLoginTokensForUser } from '@/lib/quickLoginToken';

/** POST /api/auth/login/revoke-quick-tokens — 即ログイン用トークンを無効化 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clearEmailRaw = typeof body?.clearEmail === 'string' ? body.clearEmail : '';
  const clearEmail = clearEmailRaw ? normalizeLoginEmail(clearEmailRaw) : null;

  await revokeQuickLoginTokensForUser(session.user.id);

  const res = NextResponse.json({ success: true });
  if (clearEmail) {
    res.cookies.set(quickLoginCookieName(clearEmail), '', quickLoginCookieOptions(0));
  }
  if (session.user.email) {
    res.cookies.set(
      quickLoginCookieName(session.user.email),
      '',
      quickLoginCookieOptions(0),
    );
  }
  return res;
}
