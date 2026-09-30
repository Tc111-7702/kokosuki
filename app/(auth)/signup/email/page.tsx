'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

function SignupEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerParam = searchParams.get('provider');
  const provider: LoginEmailProvider =
    providerParam === 'google' || providerParam === 'apple' ? providerParam : 'email';
  const { ready } = useSignupStepGuard({ requireFavorites: true });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <LoginEmailStep
      flow="signup"
      provider={provider}
      onBack={() => router.push('/signup/signin')}
      // 案内文(email含む)は保持せず、OTPページで pending の email から再生成する。
      onSent={() => router.push('/signup/otp')}
    />
  );
}

// 新規登録: メールアドレス入力（OTP送信）。お気に入り無効なら /signup へ。
export default function SignupEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" aria-busy="true" />}>
      <SignupEmailInner />
    </Suspense>
  );
}
