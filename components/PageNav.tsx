'use client';

import { useSyncExternalStore } from 'react';
import { Home, MapPin, User, Plus, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNavActive } from '@/lib/useNavActive';
import { useUnreadNotificationCount } from '@/lib/useUnreadNotificationCount';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { KokosukiLogo } from '@/components/ui/KokosukiLogo';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/desktopPageNav';

const NAV_ITEMS = [
  { path: '/home',          label: 'ホーム',     icon: <Home size={20} /> },
  { path: '/map',           label: 'さがす',     icon: <MapPin size={20} /> },
  { path: '/post',          label: '投稿する',   icon: null },
  { path: '/notifications', label: '通知',       icon: <Bell size={20} /> },
  { path: '/mypage',        label: 'マイページ', icon: <User size={20} /> },
];

const POST_BG = '#FFCD31';        // 投稿ボタンの黄色

export function PageNav() {
  const router   = useRouter();
  const unread = useUnreadNotificationCount();
  const isNavActive = useNavActive();
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const activeColor = isDark ? '#F2B800' : '#1A1A1A';
  const inactiveColor = isDark ? '#FFFFFF' : '#C4C3C0';
  const navBorderColor = isDark ? '#262626' : '#EDE9D8';

  return (
    <nav
      className="flex-shrink-0 flex flex-col bg-white h-screen sticky top-0"
      style={{ width: DESKTOP_PAGE_NAV_WIDTH, borderRight: `1.5px solid ${navBorderColor}` }}
    >
      {/* ロゴ */}
      <div className="flex items-center justify-center pt-6 pb-4 px-2">
        <KokosukiLogo width={72} />
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
          const color = isActive ? activeColor : inactiveColor;
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
