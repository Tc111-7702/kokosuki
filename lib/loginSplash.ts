export const LOGIN_FROM_LOGOUT_KEY = 'mikke_login_from_logout';
export const LOGIN_SPLASH_SEEN_KEY = 'mikke_login_splash_seen';

export function shouldShowLoginSplash(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(LOGIN_FROM_LOGOUT_KEY)) {
    sessionStorage.removeItem(LOGIN_FROM_LOGOUT_KEY);
    return false;
  }
  return !sessionStorage.getItem(LOGIN_SPLASH_SEEN_KEY);
}

export function markLoginSplashSeen(): void {
  try {
    sessionStorage.setItem(LOGIN_SPLASH_SEEN_KEY, '1');
  } catch {
    /* sessionStorage 不可時は無害にスキップ */
  }
}

export function markLoginFromLogout(): void {
  try {
    sessionStorage.setItem(LOGIN_FROM_LOGOUT_KEY, '1');
  } catch {
    /* sessionStorage 不可時は無害にスキップ */
  }
}
