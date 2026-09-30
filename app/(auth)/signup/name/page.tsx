'use client';

import { useRouter } from 'next/navigation';
import { SignupNicknameStep } from '@/components/SignupNicknameStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: ニックネーム入力。password までが揃っていなければ /signup/email へ。
export default function SignupNamePage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({
    requireFavorites: true,
    requirePending: true,
    requireFields: ['emailVerified', 'password'],
  });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupNicknameStep
      onBack={() => router.push('/signup/profile-intro')}
      onContinue={() => router.push('/signup/birthdate')}
      onSessionExpired={() => router.replace('/signup/email')}
    />
  );
}
