import { NextRequest, NextResponse } from 'next/server';

/** Better Auth の session_token（開発 http ではプレフィックスなし） */
export const KOKOSUKI_SESSION_COOKIE = 'better-auth.session_token';
/** 本番 https では Better Auth が __Secure- 付き Cookie 名を使う */
const KOKOSUKI_SESSION_COOKIE_SECURE = `__Secure-${KOKOSUKI_SESSION_COOKIE}`;
const KOKOSUKI_SESSION_COOKIE_HOST = `__Host-${KOKOSUKI_SESSION_COOKIE}`;

export function hasKokosukiSession(request: NextRequest): boolean {
  return [KOKOSUKI_SESSION_COOKIE, KOKOSUKI_SESSION_COOKIE_SECURE, KOKOSUKI_SESSION_COOKIE_HOST].some(
    (name) => !!request.cookies.get(name)?.value,
  );
}

export function kokosukiApiUnauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}
