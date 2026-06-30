'use client';

import { useState } from 'react';
import { NewTab }       from '@/components/NewTab';
import { CommunityTab } from '@/components/CommunityTab';
import { FavoritesTab } from '@/components/FavoritesTab';

type HomeTab = 'new' | 'community' | 'favorites';

const TAB_LABELS: { key: HomeTab; label: string }[] = [
  { key: 'new',       label: '新着' },
  { key: 'community', label: 'みんな' },
  { key: 'favorites', label: 'お気に入り' },
];

export function HomeTabs() {
  const [tab, setTab] = useState<HomeTab>('new');

  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      {/* タブバー */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-3 text-[13px] font-bold relative"
              style={{ color: tab === key ? '#F2B800' : '#AAA' }}
            >
              {label}
              {tab === key && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: 20, height: 2.5, background: '#FFCD31', borderRadius: 99 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {tab === 'new'       && <NewTab />}
        {tab === 'community' && <CommunityTab />}
        {tab === 'favorites' && <FavoritesTab />}
      </div>
    </div>
  );
}
