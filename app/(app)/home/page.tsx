'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Search } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import {
  MOBILE_HEADER_PADDING_TOP,
  MOBILE_HEADER_CONTENT_HEIGHT,
  MOBILE_HOME_TAB_ROW_HEIGHT,
  MOBILE_HOME_LOGO_ZONE_HEIGHT,
} from '@/lib/mobileHeaderLayout';
import { NewTab }        from '@/components/NewTab';
import { CommunityTab }  from '@/components/CommunityTab';
import { FavoritesTab }  from '@/components/FavoritesTab';
import { HomeSearchBar } from '@/components/HomeSearchBar';
import { KokosukiHomeLogo } from '@/components/ui/KokosukiHomeLogo';

type HomeTab = 'new' | 'community' | 'favorites';

const VALID_TABS = new Set<HomeTab>(['new', 'community', 'favorites']);

const TAB_LABELS: { key: HomeTab; label: string }[] = [
  { key: 'new',       label: '見つける' },
  { key: 'community', label: 'みんな' },
  { key: 'favorites', label: 'お気に入り' },
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

  const tabBar = (fixedHeight?: number) => (
    <div className="flex" style={fixedHeight != null ? { height: fixedHeight } : undefined}>
      {TAB_LABELS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => switchTab(key)}
          className={`flex-1 relative text-[13px] font-bold ${fixedHeight != null ? 'flex items-center justify-center' : 'py-3'}`}
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
  );

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

      <div
        className="home-header-bar relative flex-shrink-0 bg-white"
        style={{ paddingTop: isMobile ? MOBILE_HEADER_PADDING_TOP : 16 }}
      >
        {isMobile && showSearchBar ? (
          <div className="overflow-visible" style={{ height: MOBILE_HEADER_CONTENT_HEIGHT }}>
            <div
              className="relative overflow-visible"
              style={{ height: MOBILE_HOME_LOGO_ZONE_HEIGHT }}
            >
              {/* 見本通り「見つける」タブ上・左寄せ（60px ゾーン内に収める） */}
              <div className="absolute z-[1] left-2" style={{ bottom: -2 }}>
                <KokosukiHomeLogo height={56} />
              </div>
              <button
                type="button"
                onClick={() => router.push('/home/search')}
                aria-label="検索"
                className="absolute right-4 top-1/2 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform z-[1]"
                style={{ background: '#F2B800', transform: 'translateY(-50%)' }}
              >
                <Search size={14} color="white" />
              </button>
            </div>
            {tabBar(MOBILE_HOME_TAB_ROW_HEIGHT)}
          </div>
        ) : (
          <>
            {showSearchBar && <HomeSearchBar />}
            {tabBar()}
          </>
        )}
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
