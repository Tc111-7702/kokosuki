import { NextResponse } from 'next/server';

const SESSION_COOKIE_BASES = [
  'better-auth.session_token',
  'better-auth.session_data',
  'better-auth.dont_remember',
  'better-auth.account_data',
] as const;

function sessionCookieClearOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

function knownSessionCookieNames(): string[] {
  const names = new Set<string>();
  for (const base of SESSION_COOKIE_BASES) {
    names.add(base);
    names.add(`__Secure-${base}`);
    names.add(`__Host-${base}`);
  }
  return [...names];
}

function isBetterAuthSessionCookieName(name: string): boolean {
  return name.includes('better-auth.session')
    || name.includes('better-auth.dont_remember')
    || name.includes('better-auth.account_data');
}

/** Better Auth セッション関連 Cookie を明示的に expire する（signOut 失敗時のフォールバック） */
export function clearKokosukiSessionCookies(
  response: NextResponse,
  cookieHeader?: string | null,
) {
  const opts = sessionCookieClearOptions();
  for (const name of knownSessionCookieNames()) {
    response.cookies.set(name, '', opts);
  }
  if (!cookieHeader) return;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    const name = eq <= 0 ? trimmed : trimmed.slice(0, eq);
    if (isBetterAuthSessionCookieName(name)) {
      response.cookies.set(name, '', opts);
    }
  }
}

/** Better Auth の signOut レスポンスから Set-Cookie を転送する */
export function forwardAuthSetCookieHeaders(from: Response, to: NextResponse): boolean {
  const cookies = typeof from.headers.getSetCookie === 'function'
    ? from.headers.getSetCookie()
    : [];
  for (const setCookie of cookies) {
    to.headers.append('set-cookie', setCookie);
  }
  return cookies.length > 0;
}
