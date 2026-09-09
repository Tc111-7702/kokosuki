'use client';

import { Home, Map, User, Plus, Bell } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUserId } from '@/lib/useCurrentUserId';
import { useUnreadNotificationCount } from '@/lib/useUnreadNotificationCount';

const NAV_ITEMS = [
  { path: '/home',          label: 'ホーム',     icon: <Home size={20} /> },
  { path: '/map',           label: 'マップ',     icon: <Map  size={20} /> },
  { path: '/post',          label: '投稿',       icon: null },
  { path: '/notifications', label: '通知',       icon: <Bell size={20} /> },
  { path: '/mypage',        label: 'マイページ', icon: <User size={20} /> },
];

const ACTIVE_COLOR = '#1A1A1A';   // アクティブ＝黒
const INACTIVE_COLOR = '#C4C3C0'; // 非アクティブ＝グレー
const POST_BG = '#FFCD31';        // 投稿ボタンの黄色

export function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const myId     = useCurrentUserId();
  const unread   = useUnreadNotificationCount();

  // マイページは「自分のページ」のときだけアクティブ（他人のプロフィール表示中は非アクティブ）
  const isNavActive = (path: string) =>
    path === '/mypage'
      ? pathname === '/mypage' || (myId != null && pathname === `/mypage/${myId}`)
      : pathname.startsWith(path);

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
        // 投稿ボタン: 黄色い丸＋白い＋（アクティブ配色の対象外）
        if (item.path === '/post') {
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60"
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: POST_BG }}
              >
                <Plus size={24} color="white" strokeWidth={2.75} />
              </span>
              <span className="font-bold" style={{ color: INACTIVE_COLOR, fontSize: 10, whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          );
        }

        const isActive = isNavActive(item.path);
        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex-1 flex flex-col items-center justify-center transition-opacity active:opacity-60"
          >
            <div className="flex flex-col items-center justify-center gap-0.5 px-4 py-1.5">
              <span className="relative" style={{ color }}>
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
              <span className="font-bold" style={{ color, fontSize: item.path === '/mypage' ? 9 : 10, whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
