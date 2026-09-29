'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginIntroStep } from '@/components/LoginIntroStep';
import { clearSignupPendingSession } from '@/lib/signupPendingCancel';

// ログインのトップ（イントロ）。スプラッシュ演出は LoginIntroStep 内で制御する。
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const clearPending = () => {
      void clearSignupPendingSession();
    };
    clearPending();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) clearPending();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  return <LoginIntroStep onLogin={() => router.push('/login/signin')} />;
}
