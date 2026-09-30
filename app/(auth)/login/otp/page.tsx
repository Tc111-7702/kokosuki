import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOGIN_FLOW_COOKIE_NAME } from '@/lib/loginFlowCookie';
import { resolveLoginFlowPending } from '@/lib/loginFlowPending';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import { LoginOtpPageClient } from './client';

// ログイン: 認証コード入力ページ。Cookie の不透明トークンから DB(LoginFlowPending) を引き、
// メール送信が済んでいない直接アクセス／期限切れはメール入力へ戻す。
// email(PII) は DB → サーバー → prop の経路のみ（Cookie/sessionStorage には保存しない）。
// 案内文(notice)は保存せず、mailMode/mailRedirectTo から formatMailDeliveryNotice で再生成する。
export default async function LoginOtpPage() {
  const token = (await cookies()).get(LOGIN_FLOW_COOKIE_NAME)?.value;
  const pending = await resolveLoginFlowPending(token, 'otp');
  if (!pending) redirect('/login/email');

  const notice = formatMailDeliveryNotice(
    pending.mailMode
      ? {
          mode: pending.mailMode,
          intendedTo: pending.email,
          devRedirectTo: pending.mailRedirectTo ?? undefined,
        }
      : undefined,
    pending.email,
    `${pending.email} に認証コードを送信しました`,
  );

  return (
    <LoginOtpPageClient email={pending.email} provider={pending.provider} initialMailNotice={notice} />
  );
}
