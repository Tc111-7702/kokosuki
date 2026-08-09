'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { usePolling } from '@/lib/usePolling';

// サイドバー通知バッジの自動更新間隔（秒）。0以下で無効。
export const NOTIFICATION_POLL_SECONDS = 30;

/** 未読通知数（ナビのバッジ用）。マウント/遷移/フォーカス時に即更新＋一定間隔で更新＆クリーンアップ */
export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  // 通知数の取得＋バッジ更新
  const load = useCallback(() => {
    return fetch('/api/notifications/unread-count')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setCount(d.count ?? 0); })
      .catch(() => {});
  }, []);

  // 既読かつ24時間経過した通知の削除（旧 Vercel cron の代替）
  const cleanup = useCallback(() => {
    return fetch('/api/notifications/cleanup', { method: 'POST' }).catch(() => {});
  }, []);

  // マウント/ページ遷移/フォーカス時は取得のみ（素早くバッジ更新）
  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [pathname, load]);

  // 一定間隔: 通知数取得 → 完了後にクリーンアップ（順番に実行）
  const tasks = useMemo(() => [load, cleanup], [load, cleanup]);
  usePolling(tasks, NOTIFICATION_POLL_SECONDS);

  return count;
}
