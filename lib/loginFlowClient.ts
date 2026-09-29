// クライアント専用の定数（crypto を含む loginFlowTicket.ts はクライアントへ import しない）。
// メール送信ページ → 認証コードページへ、メール配信の案内文だけを sessionStorage で受け渡す。
// 中身は「◯◯ に認証コードを送信しました」等の一時的なUI文言（同タブのみ・遷移後に破棄）。
export const LOGIN_OTP_NOTICE_KEY = 'kokosuki_login_otp_notice';
