'use client';

import { useRouter } from 'next/navigation';
import { SignupBirthDateStep } from '@/components/SignupBirthDateStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: 生年月日入力。name までが揃っていなければ /signup/email へ。
export default function SignupBirthDatePage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({
    requireFavorites: true,
    requirePending: true,
    requireFields: ['emailVerified', 'password', 'name'],
  });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupBirthDateStep
      onBack={() => router.push('/signup/name')}
      onContinue={() => router.push('/signup/handle')}
      onSessionExpired={() => router.replace('/signup/email')}
    />
  );
}
