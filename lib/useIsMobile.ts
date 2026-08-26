'use client';

import { useState, useEffect } from 'react';

export function useIsMobile(): boolean {
  // 初期値 true（モバイル前提）。スマホ多数派で初回のデスクトップ→モバイルのちらつきを防ぐ。
  // SSR/初期描画も同値のためハイドレーション不整合は起きない（補正は useEffect 後）。
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
