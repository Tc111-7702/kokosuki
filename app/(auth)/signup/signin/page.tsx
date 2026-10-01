'use client';

import { useRouter } from 'next/navigation';
import { LoginSignInStep, type LoginSignInProvider } from '@/components/LoginSignInStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: プロバイダ選択（Google / Apple / メール）。お気に入り無効なら /signup へ。
// Google はログインと同じく Google のアカウント選択ページへ全画面リダイレクトし、
// 自前 callback で「既存→即時ログイン / 未登録→OTP送信して /signup/otp」に分岐する。
export default function SignupSignInPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({ requireFavorites: true });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  const handleSelectProvider = (provider: LoginSignInProvider) => {
    if (provider === 'google') {
      window.location.href = '/api/auth/signup/google/start';
      return;
    }
    router.push(`/signup/email?provider=${provider}`);
  };

  return (
    <LoginSignInStep
      intent="signup"
      onBack={() => router.push('/signup/intro')}
      onSelectProvider={handleSelectProvider}
    />
  );
}
