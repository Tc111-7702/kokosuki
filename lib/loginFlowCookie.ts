// Edge(middleware) からも読めるログインフロー用の定数/Cookieオプション（crypto・DB に依存しない）。
// トークンの発行・検証と DB(LoginFlowPending) 操作は Node ランタイム側の lib/loginFlowPending.ts。
export const LOGIN_FLOW_COOKIE_NAME = 'kokosuki_login_flow';
export const LOGIN_FLOW_TTL_SEC = 30 * 60; // 30分

export function loginFlowCookieOptions(maxAge = LOGIN_FLOW_TTL_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
