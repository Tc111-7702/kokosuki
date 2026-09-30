'use client';

import { useEffect } from 'react';

// Map / 店舗詳細ページで共有する、在庫状態の自動失効トリガー。
// マウント時に /api/machines/expire-stale-stock を叩き、最新の在庫報告が7日を過ぎた Machine の
// stockStatus を「不明」に戻す。既読通知の自動クリーンアップ（useUnreadNotificationCount）と同じく
// cron の代わりに「開いた時に1日1回」方式。ブラウザごとに localStorage でスロットリングする。
const THROTTLE_KEY = 'kokosuki-expire-stale-stock-at';
const THROTTLE_MS = 24 * 60 * 60 * 1000; // 24hに1回まで（1日1回で十分）

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
