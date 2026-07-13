'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewTab }        from '@/components/NewTab';
import { CommunityTab }  from '@/components/CommunityTab';
import { FavoritesTab }  from '@/components/FavoritesTab';
import { HomeSearchBar } from '@/components/HomeSearchBar';
import { MikkeIcon }     from '@/components/ui/MikkeIcon';

type HomeTab = 'new' | 'community' | 'favorites';

const VALID_TABS = new Set<HomeTab>(['new', 'community', 'favorites']);

const TAB_LABELS: { key: HomeTab; label: string }[] = [
  { key: 'new',       label: '新着' },
  { key: 'community', label: 'みんな' },
  { key: 'favorites', label: 'お気に入り' },
];

function HomePageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(true);

  // URLの ?tab= からタブを決定、不正値は 'new' にフォールバック
  const rawTab = searchParams.get('tab');
  const tab: HomeTab = VALID_TABS.has(rawTab as HomeTab) ? (rawTab as HomeTab) : 'new';

  // マウント時: URLにtabがなければsessionStorageから復元してURLに反映
  useEffect(() => {
    if (!rawTab) {
      const saved = sessionStorage.getItem('homeTab') as HomeTab | null;
      if (saved && VALID_TABS.has(saved)) {
        router.replace(`/home?tab=${saved}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URLに ?tab= が明示されているときだけsessionStorageに保存
  // （rawTabがnullのときは書き込まない → 復元前に上書きされるのを防ぐ）
  useEffect(() => {
    if (rawTab && VALID_TABS.has(rawTab as HomeTab)) {
      sessionStorage.setItem('homeTab', rawTab);
    }
  }, [rawTab]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const switchTab = (key: HomeTab) => {
    router.replace(`/home?tab=${key}`);
  };

  const showSearchBar = tab === 'new' || tab === 'community' || tab === 'favorites';

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

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
