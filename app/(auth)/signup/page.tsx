'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignupIpSelectStep } from '@/components/SignupIpSelectStep';
import { clearSignupGachaIds, setSignupIpNames } from '@/lib/signupFavorites';

// 新規登録: 推しIP選択（エントリ）。再訪時はガチャ選択をクリアして最新IPへ整合させる。
export default function SignupIpSelectPage() {
  const router = useRouter();

  useEffect(() => {
    clearSignupGachaIds();
  }, []);

  return (
    <SignupIpSelectStep
      onBack={() => router.push('/login')}
      onContinue={(ips) => {
        setSignupIpNames(ips);
        router.push('/signup/gacha');
      }}
    />
  );
}
