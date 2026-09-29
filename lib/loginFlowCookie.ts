// Edge(middleware) からも読めるログインフロー用の定数（crypto に依存しない）。
// 署名・検証ロジックは Node ランタイム側の lib/loginFlowTicket.ts に置く。
export const LOGIN_FLOW_COOKIE_NAME = 'kokosuki_login_flow';
export const LOGIN_FLOW_TTL_SEC = 10 * 60; // 10分
