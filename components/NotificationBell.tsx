'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

interface Props {
  onClick: () => void;
}

/** ホーム検索バー横の通知ベル（未読バッジ付き） */
export function NotificationBell({ onClick }: Props) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/notifications/unread-count')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d) setUnread(d.count ?? 0);
        })
        .catch(() => {});
    load();
    window.addEventListener('focus', load);
    return () => {
      alive = false;
      window.removeEventListener('focus', load);
    };
  }, []);

  return (
    <button
      onClick={() => {
        setUnread(0);
        onClick();
      }}
      className="relative p-2 flex-shrink-0 active:opacity-60"
      aria-label="通知"
    >
      <Bell size={22} color="#555" />
      {unread > 0 && (
        <span
          className="absolute flex items-center justify-center"
          style={{
            top: 2,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#E5484D',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            padding: '0 4px',
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
