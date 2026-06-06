'use client';

import { Home, Map, User } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import type { BottomTab } from '@/lib/sunlit/types';

const NAV_ITEMS: { tab: BottomTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'home',   label: 'ホーム',     icon: <Home size={20} /> },
  { tab: 'map',    label: 'マップ',     icon: <Map  size={20} /> },
  { tab: 'mypage', label: 'マイページ', icon: <User size={20} /> },
];

const TAB_TO_SCREEN: Record<BottomTab, 'home' | 'map' | 'mypage'> = {
  home: 'home',
  map: 'map',
  mypage: 'mypage',
};

const ACTIVE_COLOR = '#F2B800';

export function BottomNav() {
  const { screen, navigateTo } = useSunlit();

  const activeTab: BottomTab | null =
    screen === 'home' ? 'home' :
    screen === 'map' || screen === 'spot_detail' ? 'map' :
    screen === 'mypage' ? 'mypage' : null;

  return (
    <nav
      className="flex-shrink-0 bg-white flex items-stretch"
      style={{ height: '64px', borderTop: '1.5px solid #EDE9D8', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => navigateTo(TAB_TO_SCREEN[item.tab])}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60"
          >
            {/* アクティブ背景ピル */}
            <div
              className="flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200"
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
            </div>
          </button>
        );
      })}
    </nav>
  );
}
