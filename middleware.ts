import { NextRequest, NextResponse } from 'next/server';

// Better Auth のセッションCookie名
const SESSION_COOKIE = 'better-auth.session_token';

// (app) 配下のルート（ログイン必須）
const APP_PREFIX = ['/home', '/mypage', '/map', '/feed', '/gacha'];
// (auth) 配下のルート（ログイン済みならアプリへ）
const AUTH_PATHS = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;

  // ① ルート `/` → セッションの有無で振り分け
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasSession ? '/home' : '/login', request.url),
    );
  }

  // ② アプリルート → 未ログインなら /login へ
  if (APP_PREFIX.some((p) => pathname.startsWith(p))) {
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname); // ログイン後に元のページへ戻れるよう
      return NextResponse.redirect(loginUrl);
    }
  }

  // ③ 認証ルート → ログイン済みなら /home へ
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/home/:path*',
    '/mypage/:path*',
    '/map/:path*',
    '/feed/:path*',
    '/gacha/:path*',
    '/login/:path*',
    '/signup/:path*',
  ],
};
