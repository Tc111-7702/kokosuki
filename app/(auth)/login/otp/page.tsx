import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  LOGIN_FLOW_COOKIE_NAME,
  verifyLoginFlowTicket,
} from '@/lib/loginFlowTicket';
import { LoginOtpPageClient } from './LoginOtpPageClient';

// ログイン: 認証コード入力ページ。サーバー側でチケット（step=otp）を検証し、
// メール送信が済んでいない直接アクセス／期限切れはメール入力へ戻す。
export default async function LoginOtpPage() {
  const token = (await cookies()).get(LOGIN_FLOW_COOKIE_NAME)?.value;
  const ticket = verifyLoginFlowTicket(token, 'otp');
  if (!ticket) redirect('/login/email');
  return <LoginOtpPageClient email={ticket.email} provider={ticket.provider} />;
}
