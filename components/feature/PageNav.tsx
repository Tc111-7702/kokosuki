'use client';

import { Home, Map, User } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { path: '/home',   label: 'ホーム',     icon: <Home size={20} /> },
  { path: '/map',    label: 'マップ',     icon: <Map  size={20} /> },
  { path: '/mypage', label: 'マイページ', icon: <User size={20} /> },
];

const ACTIVE_COLOR = '#F2B800';

export function PageNav() {
  const router   = useRouter();
  const pathname = usePathname();

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
          const isActive = pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 active:opacity-60"
              style={{ background: isActive ? '#FFF8D0' : 'transparent' }}
            >
              <span style={{ color: isActive ? ACTIVE_COLOR : '#C4C3C0' }}>
                {item.icon}
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: isActive ? ACTIVE_COLOR : '#C4C3C0' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
