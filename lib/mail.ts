import { Resend } from 'resend';
import { isResendSandboxRestriction } from './mailDeliveryNotice';
import { normalizePasswordResetUrl } from './passwordResetUrl';

export type OtpMailType =
  | 'sign-in'
  | 'email-verification'
  | 'forget-password'
  | 'change-email';

const SUBJECTS: Record<OtpMailType, string> = {
  'sign-in': '【mikke】ログイン認証コード',
  'email-verification': '【mikke】メール認証コード',
  'forget-password': '【mikke】パスワード再設定コード',
  'change-email': '【mikke】メールアドレス変更の認証コード',
};

const DEFAULT_FROM = 'mikke <onboarding@resend.dev>';

export type MailDeliveryMode = 'resend' | 'dev-redirect' | 'dev-console';

export type MailDeliveryResult = {
  mode: MailDeliveryMode;
  intendedTo: string;
  devRedirectTo?: string;
};

function isDevMailFallback(): boolean {
  return process.env.NODE_ENV === 'development';
}

function extractResendAllowedEmail(message: string): string | null {
  const match = message.match(/own email address \(([^)]+)\)/i);
  return match?.[1]?.trim() ?? process.env.RESEND_DEV_MAIL_TO?.trim() ?? null;
}

function logDevFallback(lines: string[]): void {
  for (const line of lines) console.log(line);
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  devFallbackLog: string[];
}): Promise<MailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? DEFAULT_FROM;
  if (!apiKey) {
    if (isDevMailFallback()) {
      logDevFallback(params.devFallbackLog);
      return { mode: 'dev-console', intendedTo: params.to };
    }
    throw new Error('RESEND_API_KEY が未設定です');
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) {
    if (isDevMailFallback()) {
      console.warn(`[mail:dev] Resend error — ${error.message}`);
      const allowedTo = extractResendAllowedEmail(error.message);
      if (allowedTo && allowedTo.toLowerCase() !== params.to.toLowerCase()) {
        const { error: redirectError } = await resend.emails.send({
          from,
          to: allowedTo,
          subject: `[DEV] ${params.subject}`,
          html: `<p style="font-family:sans-serif;font-size:13px;color:#666">開発環境: 本来 <strong>${params.to}</strong> 宛のメールです。</p>${params.html}`,
        });
        if (!redirectError) {
          console.warn(`[mail:dev] Redirected to ${allowedTo} (intended: ${params.to})`);
          logDevFallback(params.devFallbackLog);
          return { mode: 'dev-redirect', intendedTo: params.to, devRedirectTo: allowedTo };
        }
      }
      logDevFallback(params.devFallbackLog);
      return { mode: 'dev-console', intendedTo: params.to };
    }
    throw new Error(error.message);
  }
  return { mode: 'resend', intendedTo: params.to };
}

function buildOtpHtml(otp: string, type: OtpMailType): string {
  const intro =
    type === 'change-email'
      ? 'メールアドレス変更の認証コードをお送りします。'
      : '認証コードをお送りします。';
  return `<!DOCTYPE html>
<html lang="ja">
<body style="font-family:sans-serif;color:#111;line-height:1.6">
  <p>${intro}</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0">${otp}</p>
  <p style="font-size:13px;color:#666">このコードは5分間有効です。心当たりがない場合はこのメールを無視してください。</p>
</body>
</html>`;
}

function buildPasswordResetHtml(url: string, name: string): string {
  const displayName = name.trim() || 'ユーザー';
  return `<!DOCTYPE html>
<html lang="ja">
<body style="font-family:sans-serif;color:#111;line-height:1.6">
  <p>${displayName} さん</p>
  <p>パスワード再設定のリクエストを受け付けました。以下のリンクからパスワードを変更してください。</p>
  <p style="margin:20px 0;word-break:break-all">
    <a href="${url}" style="color:#0066cc">${url}</a>
  </p>
  <p style="font-size:13px;color:#666">このリンクは1時間有効です。心当たりがない場合はこのメールを無視してください。</p>
</body>
</html>`;
}

/** Better Auth sendResetPassword から呼ばれるパスワード再設定メール。 */
export async function sendPasswordResetEmail({
  email,
  url,
  name,
}: {
  email: string;
  url: string;
  name: string;
}): Promise<MailDeliveryResult> {
  const resetUrl = normalizePasswordResetUrl(url);
  return sendResendEmail({
    to: email,
    subject: '【mikke】パスワード再設定',
    html: buildPasswordResetHtml(resetUrl, name),
    devFallbackLog: [`[mail:dev] Password reset to ${email}: ${resetUrl}`],
  });
}

/** Better Auth emailOTP から呼ばれる OTP メール送信。 */
export async function sendOtpEmail({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: OtpMailType;
}): Promise<MailDeliveryResult> {
  return sendResendEmail({
    to: email,
    subject: SUBJECTS[type],
    html: buildOtpHtml(otp, type),
    devFallbackLog: [`[mail:dev] OTP to ${email} (${type}): ${otp}`],
  });
}
