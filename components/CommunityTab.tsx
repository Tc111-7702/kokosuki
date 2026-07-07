'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type StockFeedPost } from '@/components/StockPostCard';
import { type FeedPost, type UserResult, type TrendingGacha, type TrendingIP, type RecommendedUser } from '@/components/community-types';
import { Feed } from '@/components/CommunityFeed';
import { PostDetail } from '@/components/PostDetail';
import { StockPostDetail } from '@/components/StockPostDetail';
import { CommunitySearchBar, UserResultList } from '@/components/CommunitySearchBar';
import { RecommendedUserRow } from '@/components/RecommendedUserRow';
import { GachaAvatar } from '@/components/ui/GachaAvatar';
import { TrendingSection, TrendingRow } from '@/components/ui/TrendingCard';

// ─── RightSidebar ─────────────────────────────────────────────────────────────

function RightSidebar({
  onSearch,
  onClear,
  searchActive,
}: {
  onSearch: (label: string, gachaIds: string[], users: UserResult[]) => void;
  onClear: () => void;
  searchActive: boolean;
}) {
  const router = useRouter();
  const [trendingGachas,    setTrendingGachas]    = useState<TrendingGacha[]>([]);
  const [trendingIPs,       setTrendingIPs]       = useState<TrendingIP[]>([]);
  const [recommendedUsers,  setRecommendedUsers]  = useState<RecommendedUser[]>([]);
  const [usersFetched,      setUsersFetched]      = useState(false);

  useEffect(() => {
    fetch('/api/community/trending')
      .then(r => r.json())
      .then(d => {
        if (d.trendingGachas) setTrendingGachas(d.trendingGachas);
        if (d.trendingIPs)    setTrendingIPs(d.trendingIPs);
      })
      .catch(() => {});

    fetch('/api/community/recommended-users')
      .then(r => r.json())
      .then(d => { if (d.users) setRecommendedUsers(d.users); })
      .catch(() => {})
      .finally(() => setUsersFetched(true));
  }, []);

  const handleUserFollowed = (id: string) => {
    setRecommendedUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="hidden lg:block w-[480px] xl:w-[560px] flex-shrink-0 pl-6 pr-4 pt-4 h-full overflow-y-auto">
      <div className="space-y-4 pb-8">
        <CommunitySearchBar onSearch={onSearch} onClear={onClear} searchActive={searchActive} />

        {trendingIPs.length > 0 && (
          <TrendingSection title="話題のIP">
            {trendingIPs.map((ip, i) => (
              <TrendingRow
                key={ip.ipName}
                rank={i + 1}
                avatar={
                  <GachaAvatar
                    imageUrl={ip.imageUrl}
                    gradientFrom={ip.gradientFrom}
                    gradientTo={ip.gradientTo}
                    name={ip.ipName}
                    size={38}
                  />
                }
                title={ip.ipName}
                likeCount={ip.likeCount}
                onClick={() => router.push(`/search/genre?ipName=${encodeURIComponent(ip.ipName)}&label=${encodeURIComponent(ip.ipName)}`)}
              />
            ))}
          </TrendingSection>
        )}

        {trendingGachas.length > 0 && (
          <TrendingSection title="話題のガチャ">
            {trendingGachas.map((g, i) => (
              <TrendingRow
                key={g.id}
                rank={i + 1}
                avatar={
                  <GachaAvatar
                    imageUrl={g.imageUrl}
                    gradientFrom={g.gradientFrom}
                    gradientTo={g.gradientTo}
                    name={g.seriesName}
                    size={38}
                  />
                }
                title={g.seriesName}
                subtitle={g.ipName}
                likeCount={g.likeCount}
                onClick={() => router.push(`/gacha/${g.id}`)}
              />
            ))}
          </TrendingSection>
        )}

        {usersFetched && (
          <TrendingSection title="おすすめのユーザー">
            {recommendedUsers.length > 0
              ? recommendedUsers.map(u => (
                  <RecommendedUserRow key={u.id} user={u} onFollowed={handleUserFollowed} />
                ))
              : (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>おすすめのユーザーはいません</p>
                  <p style={{ fontSize: 11, color: '#aaa' }}>お気に入りのIPを登録すると、同じIPが好きなユーザーが表示されます</p>
                </div>
              )
            }
          </TrendingSection>
        )}
      </div>
    </div>
  );
}

// ─── CommunityTab ─────────────────────────────────────────────────────────────

type FeedTab = 'recommended' | 'following' | 'search';

export function CommunityTab() {
  const [activeTab,      setActiveTab]      = useState<FeedTab>('recommended');
  const [selectedPost,   setSelectedPost]   = useState<FeedPost | null>(null);
  const [selectedStock,  setSelectedStock]  = useState<StockFeedPost | null>(null);
  const [searchLabel,    setSearchLabel]    = useState('');
  const [searchGachaIds, setSearchGachaIds] = useState<string[]>([]);
  const [searchUsers,    setSearchUsers]    = useState<UserResult[]>([]);
  const [searchActive,   setSearchActive]   = useState(false);

  const handleSearch = (label: string, gachaIds: string[], users: UserResult[]) => {
    setSearchLabel(label);
    setSearchGachaIds(gachaIds);
    setSearchUsers(users);
    setSearchActive(true);
    setActiveTab('search');
  };

  const handleClearSearch = () => {
    setSearchActive(false);
    setSearchLabel('');
    setSearchGachaIds([]);
    setSearchUsers([]);
    setActiveTab('recommended');
  };

  const TABS: { key: FeedTab; label: string }[] = [
    { key: 'recommended', label: 'おすすめ' },
    { key: 'following',   label: 'フォロー中' },
    ...(searchActive ? [{ key: 'search' as FeedTab, label: '検索' }] : []),
  ];

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className="flex-1 min-w-0 bg-[#F5F5F0] overflow-y-auto flex flex-col">
        {selectedStock ? (
          <StockPostDetail post={selectedStock} onBack={() => setSelectedStock(null)} />
        ) : selectedPost ? (
          <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} />
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
              {/* モバイルのみ: 検索バー */}
              <div className="lg:hidden px-3 pt-3 pb-1">
                <CommunitySearchBar onSearch={handleSearch} onClear={handleClearSearch} searchActive={searchActive} />
              </div>
              {/* タブ */}
              <div className="flex">
                {TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="flex-1 py-3.5 text-sm font-semibold relative transition-colors"
                    style={{ color: activeTab === key ? '#111' : '#9CA3AF' }}
                  >
                    {label}
                    {activeTab === key && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full"
                        style={{ backgroundColor: '#FBBF24' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'search' ? (
              <div className="pb-4">
                <UserResultList users={searchUsers} />
                {searchGachaIds.length > 0
                  ? <Feed key={`search-${searchLabel}`} feedType="search" searchGachaIds={searchGachaIds} onSelect={setSelectedPost} onSelectStock={setSelectedStock} />
                  : searchUsers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <span className="text-4xl mb-3">🔍</span>
                      <p className="text-sm">{'検索結果が見つかりませんでした'}</p>
                    </div>
                  )
                }
              </div>
            ) : (
              <Feed key={activeTab} feedType={activeTab} onSelect={setSelectedPost} onSelectStock={setSelectedStock} />
            )}
          </>
        )}
      </div>
      <RightSidebar onSearch={handleSearch} onClear={handleClearSearch} searchActive={searchActive} />

      {/* 投稿ボタン */}
      <button
        className="fixed bottom-20 right-6 sm:bottom-8 sm:right-10 lg:right-[540px] xl:right-[620px] z-50 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
        style={{ width: 56, height: 56, background: '#F2B800' }}
        aria-label="投稿する"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
