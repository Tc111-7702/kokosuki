'use client';

import { useRouter } from 'next/navigation';
import { LoginSignInStep } from '@/components/LoginSignInStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: プロバイダ選択（Google / Apple / メール）。お気に入り無効なら /signup へ。
export default function SignupSignInPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({ requireFavorites: true });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <LoginSignInStep
      intent="signup"
      onBack={() => router.push('/signup/intro')}
      onSelectProvider={(provider) => router.push(`/signup/email?provider=${provider}`)}
    />
  );
}
