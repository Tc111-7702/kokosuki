'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignupGachaSelectStep } from '@/components/SignupGachaSelectStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';
import { getSignupFavorites, setSignupGachaIds } from '@/lib/signupFavorites';

// 新規登録: お気に入りガチャ選択。IP未選択（お気に入り無効）なら /signup へ戻る。
export default function SignupGachaPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({ requireFavorites: true });
  const [ipNames] = useState<string[]>(() => getSignupFavorites()?.ipNames ?? []);
  const [gachaIds, setGachaIds] = useState<string[]>(() => getSignupFavorites()?.gachaIds ?? []);

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <SignupGachaSelectStep
      selectedIpNames={ipNames}
      favoriteGachaIds={gachaIds}
      onFavoriteGachaIdsChange={(ids) => {
        setGachaIds(ids);
        setSignupGachaIds(ids);
      }}
      onBack={() => router.push('/signup')}
      onContinue={() => router.push('/signup/intro')}
    />
  );
}
