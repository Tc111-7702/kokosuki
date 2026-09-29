import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOGIN_FLOW_COOKIE_NAME } from '@/lib/loginFlowCookie';
import { resolveLoginFlowPending } from '@/lib/loginFlowPending';
import { LoginPasswordPageClient } from './LoginPasswordPageClient';

// ログイン: パスワード入力ページ。Cookie の不透明トークンから DB(LoginFlowPending) を引き、
// メール確認が済んでいない直接アクセス／期限切れはメール入力へ戻す。
// email(PII) は DB → サーバー → prop の経路のみ。
export default async function LoginPasswordPage() {
  const token = (await cookies()).get(LOGIN_FLOW_COOKIE_NAME)?.value;
  const pending = await resolveLoginFlowPending(token, 'password');
  if (!pending) redirect('/login/email');
  return <LoginPasswordPageClient email={pending.email} provider={pending.provider} />;
}
