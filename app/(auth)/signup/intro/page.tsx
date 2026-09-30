'use client';

import { useRouter } from 'next/navigation';
import { SignupFeatureIntroStep } from '@/components/SignupFeatureIntroStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: 機能紹介。お気に入り無効なら /signup へ戻る。
export default function SignupIntroPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({ requireFavorites: true });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupFeatureIntroStep
      onBack={() => router.push('/signup/gacha')}
      onComplete={() => router.push('/signup/signin')}
    />
  );
}
