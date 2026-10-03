import type { RateLimitOptions } from '@/lib/rateLimit';

// パスワードログインでの「パスワードが正しくありません」連続失敗を、メールアドレス（アカウント）
// 単位でサーバー側に記録する設定。メール存在調査(IP単位)とは別で、こちらは特定アカウントへの
// 総当たり対策なので per-email が正しい。PII(メール)は DB に置くので localStorage とは違い安全。
export const LOGIN_PASSWORD_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};

export const LOGIN_PASSWORD_RATE_LIMIT_ERROR =
  'パスワードを規定回数間違えたため、セキュリティ保護の観点から一時的にログインを停止しています。しばらく時間をおいてから再度お試しください。';

export function loginPasswordRateKey(email: string): string {
  return `login-password-fail:${email.toLowerCase()}`;
}
