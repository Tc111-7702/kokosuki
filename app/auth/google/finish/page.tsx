'use client';

import { useEffect } from 'react';
import { clearSignupFavorites } from '@/lib/signupFavorites';

// Google 新規登録フローで「既存ユーザー → 即時ログイン」になった後の着地点。
// middleware は /login・/signup を認証済みだと /home へ飛ばすため、ここ（未マッチの経路）で
// sessionStorage のお気に入りを破棄してから /home へ遷移する。
export default function GoogleFinishPage() {
  useEffect(() => {
    clearSignupFavorites();
    window.location.replace('/home');
  }, []);

  return <div className="min-h-screen bg-white" aria-busy="true" />;
}
