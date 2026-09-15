import { NextRequest, NextResponse } from 'next/server';

export const KOKOSUKI_SESSION_COOKIE = 'better-auth.session_token';

export function getKokosukiApiToken(): string | undefined {
  const token = process.env.KOKOSUKI_API_TOKEN?.trim();
  return token || undefined;
}

export function isKokosukiApiTokenRequired(): boolean {
  return process.env.NODE_ENV === 'production' || !!getKokosukiApiToken();
}

export function hasValidKokosukiApiToken(request: NextRequest | Request): boolean {
  const expected = getKokosukiApiToken();
  if (!expected) return false;
  return request.headers.get('authorization') === `Bearer ${expected}`;
}

/** token-only パスで開発時トークン未設定のときは素通し（従来の scrape 挙動） */
export function isKokosukiApiTokenDevBypass(): boolean {
  return !isKokosukiApiTokenRequired();
}

export function hasKokosukiSession(request: NextRequest): boolean {
  return !!request.cookies.get(KOKOSUKI_SESSION_COOKIE)?.value;
}

export function kokosukiApiUnauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function kokosukiApiMisconfigured(message = 'KOKOSUKI_API_TOKEN is not configured'): NextResponse {
  return NextResponse.json({ error: message }, { status: 503 });
}
