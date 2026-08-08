'use client';

import { Home, Map, User, PlusSquare } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUserId } from '@/lib/useCurrentUserId';

const NAV_ITEMS = [
  { path: '/home',   label: 'ホーム',     icon: <Home       size={20} /> },
  { path: '/map',    label: 'マップ',     icon: <Map        size={20} /> },
  { path: '/post',   label: '＋投稿',     icon: <PlusSquare size={20} /> },
  { path: '/mypage', label: 'マイページ', icon: <User       size={20} /> },
];

const ACTIVE_COLOR = '#F2B800';

export function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const myId     = useCurrentUserId();

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
              <span style={{ color: isActive ? ACTIVE_COLOR : '#C4C3C0' }}>{item.icon}</span>
              <span className="text-[10px] font-bold" style={{ color: isActive ? ACTIVE_COLOR : '#C4C3C0' }}>
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
