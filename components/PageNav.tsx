'use client';

import { Home, MapPin, User, Plus, Bell } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUserId } from '@/lib/useCurrentUserId';
import { useUnreadNotificationCount } from '@/lib/useUnreadNotificationCount';

const NAV_ITEMS = [
  { path: '/home',          label: 'ホーム',     icon: <Home size={20} /> },
  { path: '/map',           label: 'さがす',     icon: <MapPin size={20} /> },
  { path: '/post',          label: '投稿する',   icon: null },
  { path: '/notifications', label: '通知',       icon: <Bell size={20} /> },
  { path: '/mypage',        label: 'マイページ', icon: <User size={20} /> },
];

const ACTIVE_COLOR = '#1A1A1A';   // アクティブ＝黒
const INACTIVE_COLOR = '#C4C3C0'; // 非アクティブ＝グレー
const POST_BG = '#FFCD31';        // 投稿ボタンの黄色

export function PageNav() {
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
      className="flex-shrink-0 flex flex-col bg-white h-screen sticky top-0"
      style={{ width: 80, borderRight: '1.5px solid #EDE9D8' }}
    >
      {/* ロゴ */}
      <div className="flex items-center justify-center pt-6 pb-4 px-2">
        <span
          className="font-black text-[#F2B800]"
          style={{ fontSize: 16, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}
        >
          Mikke!
        </span>
      </div>

      {/* ナビアイテム */}
      <div className="flex flex-col items-center gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          // 投稿ボタン: ＋と「投稿する」を黄色い丸で囲む（アクティブ配色の対象外）
          if (item.path === '/post') {
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="w-full flex items-center justify-center py-2 active:opacity-60"
              >
                <span
                  className="flex flex-col items-center justify-center rounded-full"
                  style={{ width: 56, height: 56, background: POST_BG, gap: 1, paddingBottom: 5 }}
                >
                  <Plus size={26} color="white" strokeWidth={2.75} />
                  <span style={{ color: 'white', fontSize: 9, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                </span>
              </button>
            );
          }

          const isActive = isNavActive(item.path);
          const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 active:opacity-60"
            >
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
              <span className="text-[10px] font-bold" style={{ color }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
