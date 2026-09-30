'use client';

import { useRouter } from 'next/navigation';
import { SignupProfileIntroStep } from '@/components/SignupProfileIntroStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: プロフィール入力の導入。password までが揃っていなければ /signup/email へ。
export default function SignupProfileIntroPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({
    requireFavorites: true,
    requirePending: true,
    requireFields: ['emailVerified', 'password'],
  });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupProfileIntroStep
      onBack={() => router.push('/signup/password')}
      onContinue={() => router.push('/signup/name')}
      onSessionExpired={() => router.replace('/signup/email')}
    />
  );
}
