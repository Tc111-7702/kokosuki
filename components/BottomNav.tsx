'use client';

import { Home, Map, User, PlusSquare, Bell } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUserId } from '@/lib/useCurrentUserId';
import { useUnreadNotificationCount } from '@/lib/useUnreadNotificationCount';

const NAV_ITEMS = [
  { path: '/home',          label: 'ホーム',     icon: <Home       size={20} /> },
  { path: '/map',           label: 'マップ',     icon: <Map        size={20} /> },
  { path: '/post',          label: '＋投稿',     icon: <PlusSquare size={20} /> },
  { path: '/notifications', label: '通知',       icon: <Bell       size={20} /> },
  { path: '/mypage',        label: 'マイページ', icon: <User       size={20} /> },
];

const ACTIVE_COLOR = '#F2B800';

export function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const myId     = useCurrentUserId();
  const unread   = useUnreadNotificationCount();

  // マイページ: 自分のページ or 設定ページのときアクティブ（他人のプロフィール表示中は非アクティブ）
  // マップ: マップ or 店舗詳細(/store/...)のときアクティブ
  const isNavActive = (path: string) => {
    if (path === '/mypage') {
      return pathname === '/mypage'
        || (myId != null && pathname === `/mypage/${myId}`)
        || pathname.startsWith('/settings');
    }
    if (path === '/map') {
      return pathname.startsWith('/map') || pathname.startsWith('/store');
    }
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="flex-shrink-0 bg-white flex items-stretch"
      style={{
        height: 64,
        borderTop: '1.5px solid #EDE9D8',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = isNavActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex-1 flex flex-col items-center justify-center transition-opacity active:opacity-60"
          >
            <div
              className="flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200"
              style={{ background: isActive ? '#FFF8D0' : 'transparent' }}
            >
              <span className="relative" style={{ color: isActive ? ACTIVE_COLOR : '#C4C3C0' }}>
                {item.icon}
                {item.path === '/notifications' && unread > 0 && (
                  <span
                    className="absolute flex items-center justify-center"
                    style={{ top: -5, right: -7, minWidth: 15, height: 15, borderRadius: 8, background: '#E5484D', color: 'white', fontSize: 9, fontWeight: 700, padding: '0 3px' }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              <span className="font-bold" style={{ color: isActive ? ACTIVE_COLOR : '#C4C3C0', fontSize: item.path === '/mypage' ? 9 : 10, whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
