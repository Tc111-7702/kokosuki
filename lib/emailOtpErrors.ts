type AuthError = { code?: string; message?: string } | null | undefined;

/** Better Auth emailOTP のエラーを日本語メッセージに変換する。 */
export function formatEmailOtpError(error: AuthError, fallback: string): string {
  const code = error?.code ?? '';
  if (code === 'INVALID_OTP') return '認証コードが正しくありません';
  if (code === 'OTP_EXPIRED') return '認証コードの有効期限が切れました。再送信してください';
  if (code === 'TOO_MANY_ATTEMPTS') return '試行回数が上限に達しました。しばらくしてからお試しください';

  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('invalid otp')) return '認証コードが正しくありません';
  if (msg.includes('otp expired')) return '認証コードの有効期限が切れました。再送信してください';
  if (msg.includes('too many attempts')) return '試行回数が上限に達しました。しばらくしてからお試しください';
  if (msg.includes('already') || msg.includes('exists')) return 'このメールアドレスは既に使用されています';
  if (msg.includes('same email')) return '現在と同じメールアドレスです';
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'リクエストが多すぎます。しばらくしてからお試しください';
  }

  return fallback;
}
