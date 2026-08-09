'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** 未読通知数（ナビのバッジ用）。ウィンドウフォーカス時・ページ遷移時に再取得 */
export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/notifications/unread-count')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setCount(d.count ?? 0); })
        .catch(() => {});
    load();
    window.addEventListener('focus', load);
    return () => {
      alive = false;
      window.removeEventListener('focus', load);
    };
  }, [pathname]);

  return count;
}
