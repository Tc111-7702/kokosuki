'use client';

import { useSunlit } from '@/lib/sunlit/store';
import { NewTab } from '@/components/feature/home/tabs/NewTab';
import { CommunityTab } from '@/components/feature/home/tabs/CommunityTab';
import { FavoritesTab } from '@/components/feature/home/tabs/FavoritesTab';

const TAB_LABELS = [
  { key: 'new' as const, label: '新着' },
  { key: 'community' as const, label: 'みんな' },
  { key: 'favorites' as const, label: 'お気に入り' },
];

export default function HomePage() {
  const { homeTab, setHomeTab } = useSunlit();

  return (
    <div className="flex flex-col h-screen bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setHomeTab(key)}
              className="flex-1 py-3 text-[13px] font-bold relative"
              style={{ color: homeTab === key ? '#F2B800' : '#AAA' }}
            >
              {label}
              {homeTab === key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: 20, height: 2.5, background: '#FFCD31', borderRadius: 99 }} />
              )}
            </button>
          ))}
        </div>
      </div>
      {homeTab === 'new' && <NewTab />}
      {homeTab === 'community' && <CommunityTab />}
      {homeTab === 'favorites' && <FavoritesTab />}
    </div>
  );
}
