import { NextRequest, NextResponse } from 'next/server';
import { hasKokosukiSession, kokosukiApiUnauthorized } from '@/lib/kokosukiApiAuth';
import { isPublicKokosukiApiPath } from '@/lib/kokosukiApiPublicPaths';

// (app) 配下のルート（ログイン必須）
const APP_PREFIX = ['/home', '/mypage', '/map', '/feed', '/gacha'];
// (auth) 配下のルート（ログイン済みならアプリへ）
const AUTH_PATHS = ['/login', '/signup'];

function handleApiAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (isPublicKokosukiApiPath(pathname, request.method)) {
    return null;
  }

  if (hasKokosukiSession(request)) {
    return null;
  }

  return kokosukiApiUnauthorized();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasKokosukiSession(request);

  if (pathname.startsWith('/api/')) {
    const apiResult = handleApiAuth(request);
    if (apiResult) return apiResult;
    return NextResponse.next();
  }

  // 旧形式の再設定リンク → Better Auth エンドポイントへ
  if (pathname.startsWith('/reset-password/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/auth${pathname}`;
    return NextResponse.redirect(url);
  }

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
    '/resetPassword/:path*',
    '/reset-password/:path*',
    '/api/profile/reset-password',
    '/api/auth/:path*',
    '/api/:path*',
  ],
};
