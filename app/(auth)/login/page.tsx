'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginIntroStep } from '@/components/LoginIntroStep';
import { clearSignupPendingSession } from '@/lib/signupPendingCancel';
import { clearSignupFavorites } from '@/lib/signupFavorites';

// ログインのトップ（イントロ）。スプラッシュ演出は LoginIntroStep 内で制御する。
// 堅牢性のため、ここに来たら signup/login フローの残骸をすべて掃除する：
// - sessionStorage のお気に入り（クライアント）
// - signupPending / LoginFlowPending の Cookie（HttpOnly のため middleware(proxy.ts) が破棄）
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const clearPending = () => {
      void clearSignupPendingSession();
      clearSignupFavorites();
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
