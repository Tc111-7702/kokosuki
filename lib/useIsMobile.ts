'use client';

import { useState, useEffect } from 'react';

// 画面幅がこの値未満なら true を返す。呼び出し側で基準幅を指定できる（既定 768px）。
export function useIsMobile(breakpoint = 768): boolean {
  // 初期値 true（モバイル前提）。スマホ多数派で初回のデスクトップ→モバイルのちらつきを防ぐ。
  // SSR/初期描画も同値のためハイドレーション不整合は起きない（補正は useEffect 後）。
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
