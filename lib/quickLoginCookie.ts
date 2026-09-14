import { createHash } from 'crypto';

const COOKIE_PREFIX = 'mikke_ql_';
export const QUICK_LOGIN_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function quickLoginCookieName(email: string): string {
  const hash = createHash('sha256')
    .update(normalizeLoginEmail(email))
    .digest('hex')
    .slice(0, 16);
  return `${COOKIE_PREFIX}${hash}`;
}

export function quickLoginCookieOptions(maxAge = QUICK_LOGIN_COOKIE_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[name] = decodeURIComponent(value);
  }
  return out;
}

export function getQuickLoginTokenFromCookieHeader(
  cookieHeader: string,
  email: string,
): string | null {
  const token = parseCookieHeader(cookieHeader)[quickLoginCookieName(email)];
  return typeof token === 'string' && token.length >= 16 ? token : null;
}
