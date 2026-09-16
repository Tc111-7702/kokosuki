import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  clearKokosukiSessionCookies,
  forwardAuthSetCookieHeaders,
} from '@/lib/kokosukiSessionCookie';

/** レスポンスに Better Auth セッション Cookie 削除を付与する */
export async function appendKokosukiSessionClear(
  response: NextResponse,
  requestHeaders: Headers,
): Promise<void> {
  const cookieHeader = requestHeaders.get('cookie');
  try {
    const signOutRes = await auth.api.signOut({ headers: requestHeaders, asResponse: true });
    if (!forwardAuthSetCookieHeaders(signOutRes, response)) {
      clearKokosukiSessionCookies(response, cookieHeader);
    }
  } catch (e) {
    console.error('[appendKokosukiSessionClear]', e);
    clearKokosukiSessionCookies(response, cookieHeader);
  }
}
