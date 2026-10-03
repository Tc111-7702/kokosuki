import type { RateLimitOptions } from '@/lib/rateLimit';

// メールアドレス変更時などの「現在のパスワード」照合での誤入力を、ユーザー（アカウント）単位で
// サーバー側に記録する設定。5回で15分ロック。キーは userId（PIIを含めない）。
export const VERIFY_PASSWORD_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};

export const VERIFY_PASSWORD_RATE_LIMIT_ERROR =
  'パスワードを規定回数間違えたため、セキュリティ保護の観点から一時的に入力を停止しています。しばらく時間をおいてから再度お試しください。';

export function verifyPasswordRateKey(userId: string): string {
  return `verify-password-fail:${userId}`;
}
