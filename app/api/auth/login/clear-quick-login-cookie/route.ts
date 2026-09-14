import { NextResponse } from 'next/server';
import {
  normalizeLoginEmail,
  quickLoginCookieName,
  quickLoginCookieOptions,
} from '@/lib/quickLoginCookie';

/** POST /api/auth/login/clear-quick-login-cookie — 無効な即ログイン cookie を削除 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email : '';
  const email = normalizeLoginEmail(raw);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(quickLoginCookieName(email), '', quickLoginCookieOptions(0));
  return res;
}
