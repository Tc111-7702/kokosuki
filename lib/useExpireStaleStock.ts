'use client';

import { useEffect } from 'react';

// Map / 店舗詳細ページで共有する、在庫状態の自動失効トリガー。
// マウント時に /api/machines/expire-stale-stock を叩き、最新の在庫報告が7日を過ぎた Machine の
// stockStatus を「不明」に戻す。ナビゲーション毎の連打で無料DBに負荷をかけないよう、
// ブラウザごとに一定間隔でスロットリングする（値はここで調整可能）。
const THROTTLE_KEY = 'kokosuki-expire-stale-stock-at';
const THROTTLE_MS = 10 * 60 * 1000; // 10分に1回まで

export function useExpireStaleStock() {
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(THROTTLE_KEY) ?? '0');
      if (Number.isFinite(last) && Date.now() - last < THROTTLE_MS) return;
      localStorage.setItem(THROTTLE_KEY, String(Date.now()));
    } catch {
      // localStorage が使えない環境でも処理は続行（スロットリングだけスキップ）
    }
    // 失敗しても画面に影響させない（fire-and-forget）
    void fetch('/api/machines/expire-stale-stock', { method: 'POST' }).catch(() => {});
  }, []);
}
