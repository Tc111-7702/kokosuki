'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { usePolling } from '@/lib/usePolling';

// サイドバー通知バッジの自動更新間隔（秒）。0以下で無効。
export const NOTIFICATION_POLL_SECONDS = 30;

/**
 * 未読通知数（ナビのバッジ用）。マウント/遷移時に即更新＋一定間隔で更新。
 * ポーリングは usePolling が Page Visibility 対応：非表示タブでは停止し、表示復帰時に即1回＋再開する。
 * （通知の自動クリーンアップはクライアントから分離し、Vercel Cron が /api/notifications/cleanup を叩く）
 */
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

  // マウント/ページ遷移時は取得のみ（素早くバッジ更新）
  useEffect(() => { load(); }, [pathname, load]);

  // 一定間隔で未読数を更新（非表示時は停止／復帰時に即1回＋再開）
  const tasks = useMemo(() => [load], [load]);
  usePolling(tasks, NOTIFICATION_POLL_SECONDS);

  return count;
}
