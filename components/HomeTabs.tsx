'use client';

import { useState, useEffect } from 'react';
import { NewTab }       from '@/components/NewTab';
import { CommunityTab } from '@/components/CommunityTab';
import { FavoritesTab } from '@/components/FavoritesTab';
import { HomeSearchBar } from '@/components/HomeSearchBar';

type HomeTab = 'new' | 'community' | 'favorites';

const TAB_LABELS: { key: HomeTab; label: string }[] = [
  { key: 'new',       label: '新着' },
  { key: 'community', label: 'みんな' },
  { key: 'favorites', label: 'お気に入り' },
];

function MikkeIcon({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="24" cy="26" r="17" fill="#F2B800"/>
      <circle cx="76" cy="26" r="17" fill="#F2B800"/>
      <circle cx="24" cy="26" r="10" fill="#E0A500"/>
      <circle cx="76" cy="26" r="10" fill="#E0A500"/>
      <circle cx="50" cy="57" r="41" fill="#F2B800"/>
      <circle cx="35" cy="49" r="7" fill="#1a1a1a"/>
      <circle cx="65" cy="49" r="7" fill="#1a1a1a"/>
      <circle cx="38" cy="46" r="2.5" fill="white"/>
      <circle cx="68" cy="46" r="2.5" fill="white"/>
      <ellipse cx="22" cy="66" rx="13" ry="9" fill="#FF9EB5" opacity="0.75"/>
      <ellipse cx="78" cy="66" rx="13" ry="9" fill="#FF9EB5" opacity="0.75"/>
      <ellipse cx="50" cy="60" rx="6" ry="5" fill="#1a1a1a"/>
      <path d="M 39 72 Q 50 83 61 72" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function HomeTabs() {
  const [tab, setTab] = useState<HomeTab>(() => {
    if (typeof window === 'undefined') return 'new';
    return (sessionStorage.getItem('homeTab') as HomeTab) ?? 'new';
  });
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const switchTab = (key: HomeTab) => {
    setTab(key);
    sessionStorage.setItem('homeTab', key);
  };

  const showSearchBar = tab === 'new' || tab === 'community';

  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      {/* 検索バー + タブバー */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        {showSearchBar && (
          <div style={{ paddingTop: 12 }} className="flex items-center">
            {!isMobile && (
              <div style={{ paddingLeft: 12, paddingRight: 4 }}>
                <MikkeIcon size={46} />
              </div>
            )}
            <div className="flex-1">
              <HomeSearchBar />
            </div>
          </div>
        )}
        {/* タブボタン */}
        <div className="flex">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
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
