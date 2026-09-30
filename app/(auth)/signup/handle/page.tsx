'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignupHandleStep } from '@/components/SignupHandleStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';
import { getSignupFavorites } from '@/lib/signupFavorites';

// 新規登録: ユーザーID入力＋本登録。birthDate までが揃っていなければ /signup/email へ。
// email は pending から、favoriteGachaIds は sessionStorage から取得して complete に渡す。
export default function SignupHandlePage() {
  const router = useRouter();
  const { ready, pending } = useSignupStepGuard({
    requireFavorites: true,
    requirePending: true,
    requireFields: ['emailVerified', 'password', 'name', 'birthDate'],
  });
  const [favoriteGachaIds] = useState<string[]>(() => getSignupFavorites()?.gachaIds ?? []);

  if (!ready || !pending) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupHandleStep
      email={pending.email}
      favoriteGachaIds={favoriteGachaIds}
      onBack={() => router.push('/signup/birthdate')}
      onSessionExpired={() => router.replace('/signup/email')}
    />
  );
}
