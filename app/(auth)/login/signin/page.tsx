'use client';

import { useRouter } from 'next/navigation';
import { LoginSignInStep } from '@/components/LoginSignInStep';

// ログイン: プロバイダ選択（Google / Apple / メール）
export default function LoginSignInPage() {
  const router = useRouter();
  return (
    <LoginSignInStep
      onBack={() => router.push('/login')}
      onSelectProvider={(provider) => router.push(`/login/email?provider=${provider}`)}
    />
  );
}
