'use client';

import { useRouter } from 'next/navigation';
import { SignupPasswordStep } from '@/components/SignupPasswordStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: パスワード入力。OTP未検証なら /signup/email、お気に入り無効なら /signup へ。
export default function SignupPasswordPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({
    requireFavorites: true,
    requirePending: true,
    requireFields: ['emailVerified'],
  });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupPasswordStep
      onBack={() => router.push('/signup/otp')}
      onContinue={() => router.push('/signup/profile-intro')}
      onSessionExpired={() => router.replace('/signup/email')}
    />
  );
}
