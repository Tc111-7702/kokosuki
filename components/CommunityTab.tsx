'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type StockFeedPost } from '@/components/StockPostCard';
import { type FeedPost, type TrendingGacha, type TrendingIP } from '@/components/community-types';
import { Feed, type FeedHandle } from '@/components/CommunityFeed';
import { PostDetail } from '@/components/PostDetail';
import { StockPostDetail } from '@/components/StockPostDetail';
import { CommunitySearchBar } from '@/components/CommunitySearchBar';
import { GachaAvatar } from '@/components/ui/GachaAvatar';
import { TrendingSection, TrendingRow } from '@/components/ui/TrendingCard';

// ─── RightSidebar ─────────────────────────────────────────────────────────────

function RightSidebar({
  onSearch,
  onClear,
  searchActive,
  initialValue = '',
}: {
  onSearch: (label: string, gachaIds: string[]) => void;
  onClear: () => void;
  searchActive: boolean;
  initialValue?: string;
}) {
  const router = useRouter();
  const [trendingGachas, setTrendingGachas] = useState<TrendingGacha[]>([]);
  const [trendingIPs,    setTrendingIPs]    = useState<TrendingIP[]>([]);

  useEffect(() => {
    fetch('/api/community/trending')
      .then(r => r.json())
      .then(d => {
        if (d.trendingGachas) setTrendingGachas(d.trendingGachas);
        if (d.trendingIPs)    setTrendingIPs(d.trendingIPs);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="hidden lg:block w-[480px] xl:w-[560px] flex-shrink-0 pl-6 pr-4 pt-4 h-full overflow-y-auto">
      <div className="space-y-4 pb-8">
        <CommunitySearchBar onSearch={onSearch} onClear={onClear} searchActive={searchActive} initialValue={initialValue} />

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
      </div>
    </div>
  );
}

// ─── CommunityTab ─────────────────────────────────────────────────────────────

export function CommunityTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ガチャページの「みんなで見る」等から ?gachaId=&label= 付きで来たら、その検索状態で開く
  const initGachaId = searchParams.get('gachaId');
  const initLabel   = searchParams.get('label') ?? '';
  const [selectedPost,   setSelectedPost]   = useState<FeedPost | null>(null);
  const [selectedStock,  setSelectedStock]  = useState<StockFeedPost | null>(null);
  const [searchLabel,    setSearchLabel]    = useState(initGachaId ? initLabel : '');
  const [searchGachaIds, setSearchGachaIds] = useState<string[]>(initGachaId ? [initGachaId] : []);
  const [searchActive,   setSearchActive]   = useState(!!initGachaId);
  const [deletedIds,     setDeletedIds]     = useState<string[]>([]);
  const feedRef = useRef<FeedHandle>(null);

  // 通知から来たとき（?openPost=<id>&type=post|stock）: 該当投稿を取得して返信詳細を開く
  useEffect(() => {
    const openPost = searchParams.get('openPost');
    const type = searchParams.get('type');
    if (!openPost) return;
    const url = type === 'stock' ? `/api/stock-posts/${openPost}` : `/api/posts/${openPost}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.post) return;
        if (type === 'stock') setSelectedStock(d.post as StockFeedPost);
        else setSelectedPost(d.post as FeedPost);
      })
      .catch(() => {});
  }, [searchParams]);

  // 返信投稿時、詳細（オーバーレイ）の返信数とフィード一覧の該当カードを両方+1（リロードなし）
  const bumpPostReplies = () => {
    const id = selectedPost?.id;
    if (!id) return;
    setSelectedPost((prev) => prev ? { ...prev, _count: { ...prev._count, replies: prev._count.replies + 1 } } : prev);
    feedRef.current?.bumpReplies(id, 'post');
  };
  const bumpStockReplies = () => {
    const id = selectedStock?.id;
    if (!id) return;
    setSelectedStock((prev) => prev ? { ...prev, _count: { ...prev._count, replies: prev._count.replies + 1 } } : prev);
    feedRef.current?.bumpReplies(id, 'stock');
  };

  const handleSearch = (label: string, gachaIds: string[]) => {
    setSearchLabel(label);
    setSearchGachaIds(gachaIds);
    setSearchActive(true);
  };

  const handleClearSearch = () => {
    setSearchActive(false);
    setSearchLabel('');
    setSearchGachaIds([]);
  };

  const handleDeleted = (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
    setSelectedPost(null);
    setSelectedStock(null);
  };

  const detailOpen = !!(selectedPost || selectedStock);

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className="flex-1 min-w-0 relative overflow-hidden bg-[#F5F5F0]">

        {/* フィード — 常時マウント、detail open 中は背面に隠す */}
        <div className="absolute inset-0 overflow-y-auto flex flex-col" style={{ visibility: detailOpen ? 'hidden' : 'visible' }}>
          {/* モバイルのみ: 検索バー */}
          <div className="lg:hidden sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-3 py-2">
            <CommunitySearchBar onSearch={handleSearch} onClear={handleClearSearch} searchActive={searchActive} initialValue={initLabel} />
          </div>

          {searchActive ? (
            <div className="pb-4">
              {searchLabel && (
                <div className="px-4 pt-3 pb-1">
                  <span style={{ fontSize: 13, color: '#888' }}>
                    「<span style={{ fontWeight: 700, color: '#222' }}>{searchLabel}</span>」の検索結果
                  </span>
                </div>
              )}
              {searchGachaIds.length > 0
                ? <Feed ref={feedRef} key={`search-${searchLabel}`} feedType="search" searchGachaIds={searchGachaIds} onSelect={setSelectedPost} onSelectStock={setSelectedStock} excludeIds={deletedIds} />
                : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <span className="text-4xl mb-3">🔍</span>
                    <p className="text-sm">検索結果が見つかりませんでした</p>
                  </div>
                )
              }
            </div>
          ) : (
            <Feed ref={feedRef} feedType="recommended" onSelect={setSelectedPost} onSelectStock={setSelectedStock} excludeIds={deletedIds} />
          )}
        </div>

        {/* 詳細ビュー — absolute overlay でフィードの上に重ねる */}
        {detailOpen && (
          <div className="absolute inset-0 overflow-y-auto flex flex-col bg-[#F5F5F0] z-10">
            {selectedStock
              ? <StockPostDetail post={selectedStock} onBack={() => setSelectedStock(null)} onDeleted={handleDeleted} onReplied={bumpStockReplies} />
              : selectedPost
              ? <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} onDeleted={handleDeleted} onReplied={bumpPostReplies} />
              : null
            }
          </div>
        )}
      </div>

      <RightSidebar onSearch={handleSearch} onClear={handleClearSearch} searchActive={searchActive} initialValue={initLabel} />

      {/* 投稿ボタン（返信詳細を開いている間は非表示） */}
      {!detailOpen && (
      <button
        className="fixed bottom-20 right-6 sm:bottom-8 sm:right-10 lg:right-[540px] xl:right-[620px] z-50 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
        style={{ width: 56, height: 56, background: '#F2B800' }}
        aria-label="投稿する"
        onClick={() => router.push('/post')}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      )}
    </div>
  );
}
