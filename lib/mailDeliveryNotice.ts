import type { MailDeliveryResult } from '@/lib/mail';

export function formatMailDeliveryNotice(
  mail: MailDeliveryResult | null | undefined,
  intendedTo: string,
  successMessage: string,
): string {
  if (!mail || mail.mode === 'resend') return successMessage;
  if (mail.mode === 'dev-redirect' && mail.devRedirectTo) {
    return `開発環境のため ${mail.devRedirectTo} に送信しました（${intendedTo} 宛には Resend の制限で送信できません）。`;
  }
  if (mail.mode === 'dev-console') {
    return '開発環境のため、メールの代わりにサーバーのターミナルに内容を出力しました。';
  }
  return successMessage;
}

export function isResendSandboxRestriction(message: string): boolean {
  return /only send testing emails|verify a domain/i.test(message);
}

export function formatMailSendError(error: unknown, fallback = 'メールの送信に失敗しました'): string {
  const message = error instanceof Error ? error.message : '';
  if (isResendSandboxRestriction(message)) {
    return 'メール送信ドメインが未設定のため送信できません。Resend でドメインを verify し、RESEND_FROM を設定してください。';
  }
  return fallback;
}
