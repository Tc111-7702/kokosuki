import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  LOGIN_FLOW_COOKIE_NAME,
  verifyLoginFlowTicket,
} from '@/lib/loginFlowTicket';
import { LoginPasswordPageClient } from './LoginPasswordPageClient';

// ログイン: パスワード入力ページ。サーバー側でチケット（step=password）を検証し、
// メール確認が済んでいない直接アクセス／期限切れはメール入力へ戻す。
export default async function LoginPasswordPage() {
  const token = (await cookies()).get(LOGIN_FLOW_COOKIE_NAME)?.value;
  const ticket = verifyLoginFlowTicket(token, 'password');
  if (!ticket) redirect('/login/email');
  return <LoginPasswordPageClient email={ticket.email} provider={ticket.provider} />;
}
