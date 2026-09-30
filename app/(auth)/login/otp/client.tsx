'use client';

import { useRouter } from 'next/navigation';
import { LoginOtpStep } from '@/components/LoginOtpStep';

// 認証コード入力の実体。email/notice はサーバーが DB(LoginFlowPending) から解決して渡す
// （URL・クライアントストレージに個人情報を載せない）。認証成功時の /home 遷移は
// LoginOtpStep 内で行う。
export function LoginOtpPageClient({
  email,
  provider,
  initialMailNotice,
}: {
  email: string;
  provider: string;
  initialMailNotice: string | null;
}) {
  const router = useRouter();
  return (
    <LoginOtpStep
      email={email}
      initialMailNotice={initialMailNotice}
      onBack={() => router.push(`/login/email?provider=${provider}`)}
    />
  );
}
