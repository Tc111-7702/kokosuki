'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
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
  { key: 'favorites', label: 'おきにいり' },
];

function HomePageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const MOBILE_BREAKPOINT = 768;
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);

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

  // 投稿直後（?posted=1）に「投稿を送信しました」トーストを上からスライド表示する。
  // 表示後はURLからパラメータを消し、リロード/戻るで再表示されないようにする。
  const [showPostedToast, setShowPostedToast] = useState(false);
  useEffect(() => {
    if (searchParams.get('posted') !== '1') return;
    setShowPostedToast(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('posted');
    window.history.replaceState(null, '', url.pathname + url.search);
    const t = setTimeout(() => setShowPostedToast(false), 2600);
    return () => clearTimeout(t);
  }, [searchParams]);

  const switchTab = (key: HomeTab) => {
    router.replace(`/home?tab=${key}`);
  };

  const showSearchBar = tab === 'new' || tab === 'community' || tab === 'favorites';

  return (
    <div className="relative flex flex-col h-full bg-[#FFFFFF]">
      {/* 投稿完了トースト（上からスライドイン→少し待って消える） */}
      {showPostedToast && (
        <>
          <style>{`@keyframes postedToast {
            0%   { opacity: 0; transform: translate(-50%, -16px); }
            10%  { opacity: 1; transform: translate(-50%, 0); }
            85%  { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -10px); }
          }`}</style>
          <div
            style={{
              position: 'absolute', top: 14, left: '50%', zIndex: 50,
              animation: 'postedToast 2.6s ease-out forwards', pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(28,28,30,0.92)', color: '#fff',
                padding: '10px 18px', borderRadius: 999,
                boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
                fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={18} />
              投稿を送信しました
            </div>
          </div>
        </>
      )}

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
