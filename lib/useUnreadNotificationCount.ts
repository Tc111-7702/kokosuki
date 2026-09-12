'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { usePolling } from '@/lib/usePolling';

// サイドバー通知バッジの自動更新間隔（秒）。0以下で無効。
export const NOTIFICATION_POLL_SECONDS = 30;

// 通知の自動クリーンアップの最小実行間隔（クライアント側スロットル）。24hに1回。
const CLEANUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_LS_KEY = 'notifCleanupAt';

type ReloadFn = () => void | Promise<unknown>;
const reloaders = new Set<ReloadFn>();

/** ベルバッジ用 load をすべて実行（通知ページのタブ未読更新から即時反映用） */
export function reloadUnreadNotificationCount() {
  return Promise.all([...reloaders].map((fn) => Promise.resolve(fn()).catch(() => {})));
}

/**
 * 未読数（ナビのベルバッジ用）。個人通知＋未読お知らせの合計。マウント/遷移時に即更新＋一定間隔で更新。
 * ポーリングは usePolling が Page Visibility 対応：非表示タブでは停止し、表示復帰時に即1回＋再開する。
 * 通知の自動クリーンアップ（既読30日経過の削除）は、cron の代わりにマウント時トリガ＋localStorage で
 * 24hに1回へスロットルして叩く（タブが長時間開かれない前提の setInterval では実行されないため）。
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

  useEffect(() => {
    reloaders.add(load);
    return () => { reloaders.delete(load); };
  }, [load]);

  // 一定間隔で未読数を更新（非表示時は停止／復帰時に即1回＋再開）
  const tasks = useMemo(() => [load], [load]);
  usePolling(tasks, NOTIFICATION_POLL_SECONDS);

  // 自動クリーンアップ（マウント時に1回だけ、前回から24h以上経過していれば実行）
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(CLEANUP_LS_KEY) ?? 0);
      if (Date.now() - last < CLEANUP_MIN_INTERVAL_MS) return;
      localStorage.setItem(CLEANUP_LS_KEY, String(Date.now())); // 先に記録して二重発火を防止
      fetch('/api/notifications/cleanup', { method: 'POST' }).catch(() => {});
    } catch {
      /* localStorage 不可（プライベートモード等）でも無害にスキップ */
    }
  }, []);

  return count;
}
