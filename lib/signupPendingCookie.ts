export const SIGNUP_PENDING_COOKIE_NAME = 'kokosuki_signup_pending';
export const SIGNUP_PENDING_COOKIE_MAX_AGE_SEC = 30 * 60;
/** SignupPending クッキー／DB の有効期限と同じ間隔でポーリング */
export const SIGNUP_PENDING_CHECK_INTERVAL_MS = SIGNUP_PENDING_COOKIE_MAX_AGE_SEC * 1000;

export function signupPendingCookieOptions(maxAge = SIGNUP_PENDING_COOKIE_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function getSignupPendingTokenFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SIGNUP_PENDING_COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return token.length >= 16 ? token : null;
  } catch {
    return null;
  }
}
