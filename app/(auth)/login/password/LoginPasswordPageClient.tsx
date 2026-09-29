'use client';

import { useRouter } from 'next/navigation';
import { LoginPasswordStep } from '@/components/LoginPasswordStep';

// パスワード入力の実体。email はサーバーがチケットから解決して渡す。
// 認証成功時の /home 遷移は LoginPasswordStep 内で行う。
export function LoginPasswordPageClient({ email, provider }: { email: string; provider: string }) {
  const router = useRouter();
  return (
    <LoginPasswordStep
      email={email}
      onBack={() => router.push(`/login/email?provider=${provider}`)}
    />
  );
}
