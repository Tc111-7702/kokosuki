import type { RateLimitOptions } from '@/lib/rateLimit';

// ログインのメール入力（送信/パスワードでログイン）での「登録されていないメールアドレス」連続失敗を
// IP単位で制限する設定。送信・確認の両エンドポイントで同じキー・同じ設定を共有する。
export const LOGIN_EMAIL_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};

export const LOGIN_EMAIL_RATE_LIMIT_ERROR =
  '試行回数が多すぎます。セキュリティ保護の観点から、しばらく時間をおいてから再度お試しください。';

export function loginEmailRateKey(ip: string): string {
  return `login-email-fail:${ip}`;
}
