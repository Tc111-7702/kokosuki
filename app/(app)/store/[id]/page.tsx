'use client';

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, MapPin, Navigation, Phone, SlidersHorizontal } from 'lucide-react';
import { HomeSearchBar } from '@/components/HomeSearchBar';
import FilterDrawer, { loadStoredGachaIds } from '@/components/FilterDrawer';
import { ipGradient, type SpotGachaInfo } from '@/components/SpotGachaCard';
import { GachaCard, type GachaItem } from '@/components/ui/GachaCard';
import NavPickerModal from '@/components/NavPickerModal';
import { StockPostCard, type StockFeedPost } from '@/components/StockPostCard';
import { PostCard } from '@/components/PostCard';
import { InlineReplies } from '@/components/InlineReplies';
import { type FeedPost, type FeedItem } from '@/components/community-types';
import { useIsMobile } from '@/lib/useIsMobile';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { StoreReviews } from '@/components/StoreReviews';

// ─── 型定義 ──────────────────────────────────────────────────

interface SpotData {
  id: string; name: string; address: string;
  lat: number; lng: number;
  phone?: string | null; googleMapsUrl: string | null;
  gachaIds: string[];
  stockMap: Record<string, string>;
}

const STORAGE_KEY = 'kokosuki_filter_gacha_ids';

// ─── ユーティリティ ───────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function toGachaItem(g: SpotGachaInfo): GachaItem {
  const [gradientFrom, gradientTo] = ipGradient(g.ipName);
  return {
    id: g.id,
    seriesName: g.seriesName,
    ipName: g.ipName,
    imageUrl: g.imageUrl,
    gradientFrom,
    gradientTo,
    likeCount: 0,
    status: 'on_sale',
    releaseDate: null,
  };
}

// ─── StorePosts コンポーネント ─────────────────────────────────

type OpenReply = { id: string; type: 'post' | 'stock' } | null;

function StorePosts({
  spotId,
  filterGachaIds,
  autoOpen,
  flushX = false,
}: {
  spotId: string;
  filterGachaIds: string[];
  autoOpen?: { id: string; type: 'post' | 'stock' } | null;
  flushX?: boolean;
}) {
  const [posts,         setPosts]         = useState<FeedItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [openReply,     setOpenReply]     = useState<OpenReply>(null);
  const [autoOpenDone,  setAutoOpenDone]  = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 在庫・通常を別バケツでページング（feed API のバケツ契約に合わせる）
  const stockOffsetRef = useRef(0);
  const feedOffsetRef  = useRef(0);
  const stockMoreRef   = useRef(true);
  const feedMoreRef    = useRef(true);
  const hasMoreRef     = useRef(true);
  const filterRef   = useRef(filterGachaIds);
  filterRef.current = filterGachaIds;
  const loadingRef  = useRef(false);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((d: { user: { id: string } | null }) => { if (d.user?.id) setCurrentUserId(d.user.id); })
      .catch(() => {});
  }, []);

  const load = useCallback(async (reset: boolean, filter: string[]) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      if (reset) {
        stockOffsetRef.current = 0; feedOffsetRef.current = 0;
        stockMoreRef.current = true; feedMoreRef.current = true; hasMoreRef.current = true;
      }
      // 尽きたバケツは offset=-1 を送って取得スキップ
      const so = stockMoreRef.current ? stockOffsetRef.current : -1;
      const fo = feedMoreRef.current  ? feedOffsetRef.current  : -1;
      if (so < 0 && fo < 0) { hasMoreRef.current = false; return; }
      const p = new URLSearchParams({ type: 'recommended', spotId, stockOffset: String(so), feedOffset: String(fo) });
      if (filter.length > 0) p.set('filterGachaIds', filter.join(','));
      const res = await fetch('/api/posts/feed?' + p.toString());
      if (!res.ok) return;
      const data: { stock: StockFeedPost[]; feed: FeedPost[]; stockHasMore: boolean; feedHasMore: boolean } = await res.json();
      const incoming: FeedItem[] = [...(so >= 0 ? data.stock : []), ...(fo >= 0 ? data.feed : [])];
      setPosts(prev => {
        const base = reset ? [] : prev;
        const seen = new Set(base.map(i => `${i.postType}-${i.id}`));
        return [...base, ...incoming.filter(i => !seen.has(`${i.postType}-${i.id}`))];
      });
      if (so >= 0) { stockOffsetRef.current += data.stock.length; stockMoreRef.current = data.stockHasMore; }
      if (fo >= 0) { feedOffsetRef.current  += data.feed.length;  feedMoreRef.current  = data.feedHasMore;  }
      hasMoreRef.current = stockMoreRef.current || feedMoreRef.current;
    } catch {}
    loadingRef.current = false;
    if (reset) setLoading(false);
  }, [spotId]);

  // フィルター変更 → 先頭から再フェッチ
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    load(true, filterGachaIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGachaIds.join(','), load]);

  // 無限スクロール
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreRef.current) {
        load(false, filterRef.current);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [load]);

  // 通知から来たとき: 対象投稿を見つけるまでページを読み込み、見つかったら返信欄を開いてスクロール
  useEffect(() => {
    if (!autoOpen || autoOpenDone || loading) return;
    if (posts.some(p => p.id === autoOpen.id)) {
      const t = setTimeout(() => {
        setOpenReply({ id: autoOpen.id, type: autoOpen.type });
        setAutoOpenDone(true);
        document.getElementById(`post-${autoOpen.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(t);
    }
    if (hasMoreRef.current) {
      load(false, filterRef.current);
    } else {
      const t = setTimeout(() => setAutoOpenDone(true), 0);
      return () => clearTimeout(t);
    }
  }, [autoOpen, autoOpenDone, loading, posts, load]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#BBB', fontSize: 14, fontWeight: 600 }}>読み込み中…</div>
  );
  if (posts.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <p style={{ color: '#BBB', fontSize: 13, margin: 0 }}>この店舗の投稿はまだありません</p>
    </div>
  );

  const toggleReply = (id: string, type: 'post' | 'stock') =>
    setOpenReply(prev => (prev?.id === id ? null : { id, type }));

  const handleDelete = (id: string) =>
    setPosts(prev => prev.filter(p => p.id !== id));

  const updateReplyCount = (id: string, delta: number) =>
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, _count: { ...p._count, replies: p._count.replies + delta } } : p
    ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {posts.map(p => {
        const type = p.postType as 'post' | 'stock';
        const isOpen = openReply?.id === p.id;
        return (
          <div key={p.id} id={`post-${p.id}`} style={{ marginBottom: isOpen ? 0 : 8 }}>
            {type === 'stock'
              ? <StockPostCard
                  post={p as StockFeedPost}
                  interactive={false}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onReplyClick={() => toggleReply(p.id, type)}
                  replyOpen={isOpen}
                  flushX={flushX}
                />
              : <PostCard
                  post={p as FeedPost}
                  interactive={false}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onReplyClick={() => toggleReply(p.id, type)}
                  replyOpen={isOpen}
                  flushX={flushX}
                />
            }
            {isOpen && (
              <InlineReplies
                postId={p.id}
                postType={type}
                currentUserId={currentUserId}
                postOwner={p.user}
                onCountChange={(delta) => updateReplyCount(p.id, delta)}
                flushX={flushX}
              />
            )}
          </div>
        );
      })}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}

// ─── メインページ ───────────────────────────────────────────────────

export default function StorePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const spotId = params.id as string;
  const contentSearchParam = searchParams.get('contentSearch') ?? '';
  const noFilterParam = searchParams.get('noFilter') === '1';
  // 通知から来たとき: 開く対象（投稿の返信欄 or 口コミの返信欄）
  const openReplyId  = searchParams.get('openReply');
  const openReplyType = searchParams.get('type') === 'stock' ? 'stock' : 'post';
  const openReviewId = searchParams.get('openReview');
  const autoOpenPost = openReplyId ? { id: openReplyId, type: openReplyType as 'post' | 'stock' } : null;

  const [spot,          setSpot]          = useState<SpotData | null>(null);
  const [gachaMap,      setGachaMap]      = useState<Map<string, SpotGachaInfo>>(new Map());
  const [filterGachaIds,setFilterGachaIds]= useState<string[]>([]);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [navOpen,       setNavOpen]       = useState(false);
  const [currentPos,    setCurrentPos]    = useState<{ lat: number; lng: number } | null>(null);
  const [loading,       setLoading]       = useState(true);
  const MOBILE_BREAKPOINT = 768;
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const storeNameColor = isDark ? '#FFFFFF' : '#1a1a1a';
  const sectionBg = isDark ? '#0a0a0a' : '#FAFAFA';
  const sectionBorder = isDark ? '#262626' : '#F0F0F0';
  // 通知から来たとき（返信欄を開く指定あり）は「口コミ・投稿」タブを初期表示に
  const [activeTab,     setActiveTab]     = useState<'products' | 'posts'>(openReplyId || openReviewId ? 'posts' : 'products');

  // コンテンツ検索（店舗内ガチャのみ）
  const [searchGachaIds, setSearchGachaIds] = useState<string[] | null>(null);

  // データ取得
  useEffect(() => {
    Promise.all([
      fetch(`/api/spots/${spotId}`).then(r => r.json()),
      fetch('/api/gacha/filters').then(r => r.json()),
      fetch('/api/profile/me').then(r => r.json()),
    ]).then(([spotRes, filterRes, profile]) => {
      if (spotRes.spot) setSpot(spotRes.spot);
      const map = new Map<string, SpotGachaInfo>();
      (filterRes.items ?? []).forEach((g: SpotGachaInfo) => map.set(g.id, g));
      setGachaMap(map);

      const likedIds: string[] = Array.isArray(profile.likedGachaIds) ? profile.likedGachaIds : [];
      const validLikedIds = likedIds.filter(id => map.has(id));

      if (noFilterParam) {
        setFilterGachaIds([]);
        try {
          localStorage.setItem(STORAGE_KEY, validLikedIds.length > 0 ? JSON.stringify(validLikedIds) : '[]');
        } catch {}
      } else {
        const initialStored = loadStoredGachaIds();
        const merged = [...new Set([...initialStored, ...validLikedIds])];
        setFilterGachaIds(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [spotId, noFilterParam]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  const gachaIpById = useMemo(() => {
    const map = new Map<string, string>();
    gachaMap.forEach((g, id) => map.set(id, g.ipName));
    return map;
  }, [gachaMap]);

  const storeIpSuggestions = useMemo(() => {
    if (!spot) return [];
    const likeByIp = new Map<string, number>();
    for (const id of spot.gachaIds) {
      const g = gachaMap.get(id);
      if (!g?.ipName) continue;
      likeByIp.set(g.ipName, (likeByIp.get(g.ipName) ?? 0) + (g.likeCount ?? 0));
    }
    return [...likeByIp.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => ({ label, type: 'genre' as const, imageUrl: null }));
  }, [spot, gachaMap]);

  // URL引き継ぎ: マップの検索を店舗ページに引き継ぐ（店舗内のみ）
  useEffect(() => {
    if (!contentSearchParam || !spot) return;
    fetch(`/api/gacha/search?q=${encodeURIComponent(contentSearchParam)}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data.gachaIds)) return;
        const storeSet = new Set(spot.gachaIds);
        const ids = data.gachaIds.filter((id: string) => storeSet.has(id));
        if (ids.length > 0) setSearchGachaIds(ids);
      })
      .catch(() => {});
  }, [contentSearchParam, spot]);

  const applySearchFilter = useCallback((ids: string[], _label: string) => {
    setSearchGachaIds(ids);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchGachaIds(null);
  }, []);

  const handleFilterApply = useCallback((ids: string[]) => {
    setFilterGachaIds(ids);
    setFilterOpen(false);
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilterGachaIds([]);
    try { localStorage.setItem(STORAGE_KEY, '[]'); } catch {}
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: '100%', color: '#BBB', fontSize: 14, fontWeight: 700 }}>
      読み込み中…
    </div>
  );
  if (!spot) return (
    <div className="flex items-center justify-center" style={{ height: '100%', color: '#BBB', fontSize: 14 }}>
      店舗が見つかりません
    </div>
  );

  // ─── 表示商品の計算 ──────────────────────────────────────────────────
  const isSearchActive = searchGachaIds !== null;
  const searchSet      = isSearchActive ? new Set(searchGachaIds) : null;
  const isFiltered     = filterGachaIds.length > 0;

  const visibleGachas = spot.gachaIds
    .filter(id => {
      const matchesFilter = filterGachaIds.length === 0 || filterGachaIds.includes(id);
      if (searchSet != null) return searchSet.has(id) && matchesFilter;
      return matchesFilter;
    })
    .map(id => gachaMap.get(id))
    .filter((g): g is SpotGachaInfo => g !== undefined)
    .sort((a, b) => {
      if (searchSet != null) {
        const aS = searchSet.has(a.id), bS = searchSet.has(b.id);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
      }
      return 0;
    });

  const distance = currentPos ? haversineM(currentPos.lat, currentPos.lng, spot.lat, spot.lng) : null;

  // 検索ヒット件数
  const searchMatchCount = searchSet != null
    ? visibleGachas.filter(g => searchSet.has(g.id)).length
    : 0;

  const productCountLabel = isSearchActive && !isFiltered
    ? `ガチャ ${visibleGachas.length}件 うち検索結果 ${searchMatchCount}件`
    : isSearchActive && isFiltered
    ? `フィルター結果 ${visibleGachas.length}件 うち検索結果 ${searchMatchCount}件`
    : isFiltered
    ? `フィルター結果 ${visibleGachas.length}件`
    : `ガチャ ${visibleGachas.length}件`;

  // ─── ガチャ一覧エリア ────────────────────────────────────────────────────
  const ProductsArea = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: sectionBg }}>
      <div style={{ position: 'relative', flexShrink: 0, zIndex: 20 }}>
        <HomeSearchBar
          placeholder="取り扱っているガチャをさがす"
          focusSuggestions={storeIpSuggestions}
          scopeGachaIds={spot.gachaIds}
          gachaIpById={gachaIpById}
          onApplyFilter={applySearchFilter}
          filterActive={isSearchActive}
          onDismissFilter={clearSearch}
          wrapperClassName={isMobile ? 'pt-2.5 pb-1' : 'pb-0.5'}
        />
      </div>
      <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#737373' : '#888' }}>{productCountLabel}</span>
      </div>
      {/* ガチャグリッド */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', padding: '4px 16px 32px' }}>
        {visibleGachas.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, color: '#BBB' }}>
            <p style={{ fontSize: 14, margin: 0 }}>該当するガチャがありません</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            width: '100%',
            gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: isMobile ? 12 : 16,
          }}>
            {visibleGachas.map((g, rank) => (
              <div key={g.id} style={{ minWidth: 0, width: '100%' }}>
                <GachaCard
                  gacha={toGachaItem(g)}
                  rank={rank}
                  showRank={false}
                  isMobile={isMobile}
                  variant="favorite"
                  fullWidth
                  stockStatus={spot.stockMap[g.id] ?? null}
                  highlight={searchSet != null && searchSet.has(g.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── 投稿エリア ────────────────────────────────────────────────────────
  const PostsArea = (
    <div style={{ height: '100%', overflowY: 'scroll', padding: '0 16px 32px', boxSizing: 'border-box', background: sectionBg }}>
      {/* 口コミ */}
      <StoreReviews spotId={spotId} autoOpenReviewId={openReviewId} />

      {/* 仕切り */}
      <div style={{ borderTop: `1px solid ${sectionBorder}`, margin: '12px 0' }} />

      {/* みんなの投稿 */}
      <div style={{ padding: '4px 0 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
          みんなの投稿
        </span>
        {isFiltered && (
          <span style={{ fontSize: 11, color: '#AAA', marginLeft: 6 }}>フィルター中 {filterGachaIds.length}件</span>
        )}
      </div>
      <StorePosts spotId={spotId} filterGachaIds={filterGachaIds} autoOpen={autoOpenPost} flushX={isMobile} />
    </div>
  );

  return (
    <div style={{ height: '100%', background: sectionBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ─── ヘッダー ─── */}
      <div style={{ background: 'white', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
        {isMobile ? (
          <>
            {/* モバイル: 戻る+店名（左） / フィルター+解除（右）を1行に。電話・経路は非表示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
              <button onClick={() => router.back()} aria-label="戻る"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                <ChevronLeft size={22} color="#888" strokeWidth={2} />
              </button>
              <h1 style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 900, color: storeNameColor, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.name}</h1>
              <button onClick={() => setFilterOpen(true)}
                className={`map-list-toggle-btn flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold active:scale-95 transition-transform ${isFiltered ? 'map-list-toggle-btn--active' : ''}`}
                style={{ flexShrink: 0, ...(isFiltered ? {} : { background: 'rgba(245, 243, 237, 0.28)', border: '1px solid rgba(237, 233, 216, 0.45)' }) }}>
                <SlidersHorizontal size={12} />
                {isFiltered ? `フィルター中 (${filterGachaIds.length})` : 'フィルター'}
              </button>
              {isFiltered && (
                <button onClick={handleClearFilter}
                  style={{ flexShrink: 0, fontSize: 11, padding: '5px 8px', borderRadius: 20, border: 'none', cursor: 'pointer', background: '#FFF0C0', color: '#B8860B', fontWeight: 700 }}>
                  解除
                </button>
              )}
            </div>
            {distance !== null && (
              <div style={{ padding: '0 16px 8px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>現在地から {fmtDistance(distance)}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
              <button onClick={() => router.back()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0891b2', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <ArrowLeft size={18} />戻る
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isFiltered && (
                  <button onClick={handleClearFilter}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: '#FFF0C0', color: '#B8860B', fontWeight: 700 }}>
                    解除
                  </button>
                )}
                <button onClick={() => setFilterOpen(true)}
                  className={`map-list-toggle-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-transform ${isFiltered ? 'map-list-toggle-btn--active' : ''}`}
                  style={isFiltered ? undefined : { background: 'rgba(245, 243, 237, 0.28)', border: '1px solid rgba(237, 233, 216, 0.45)' }}>
                  <SlidersHorizontal size={13} />
                  {isFiltered ? `フィルター中 (${filterGachaIds.length})` : 'フィルター'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 12px' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <h1 style={{ fontSize: 17, fontWeight: 900, color: storeNameColor, margin: 0, lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.name}</h1>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#888', minWidth: 0, maxWidth: '100%' }}>
                    <MapPin size={11} color="#aaa" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.address}</span>
                  </span>
                  {distance !== null && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2', whiteSpace: 'nowrap', flexShrink: 0 }}>現在地から {fmtDistance(distance)}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {spot.phone && (
                  <a href={`tel:${spot.phone.replace(/[^\d+]/g, '')}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 12, background: '#E8F5E9', color: '#16a34a', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                    <Phone size={14} />電話
                  </a>
                )}
                <button onClick={() => setNavOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 12, background: '#E8F4FD', color: '#0891b2', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  <Navigation size={14} />経路
                </button>
              </div>
            </div>
          </>
        )}

        {/* モバイル: タブ切り替え */}
        {isMobile && (
          <div style={{ display: 'flex' }}>
            {(['products', 'posts'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'none',
                  borderBottom: activeTab === tab ? '2px solid #F2B800' : '2px solid transparent',
                  color: activeTab === tab ? '#F2B800' : '#888',
                }}>
                {tab === 'products' ? 'ガチャ一覧' : '口コミ / 投稿'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── コンテンツ ─── */}
      {isMobile ? (
        // モバイル: アクティブタブのみ表示
        <div style={{ flex: 1, overflow: 'hidden', background: sectionBg }}>
          {activeTab === 'products' ? ProductsArea : PostsArea}
        </div>
      ) : (
        // デスクトップ: 左右2列
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: sectionBg }}>
          {/* 左: ガチャ一覧 */}
          <div style={{ flex: '0 0 55%', borderRight: `1px solid ${sectionBorder}`, overflow: 'hidden', background: sectionBg }}>
            {ProductsArea}
          </div>
          {/* 右: みんなの投稿 */}
          <div style={{ flex: '0 0 45%', overflow: 'hidden', background: sectionBg }}>
            {PostsArea}
          </div>
        </div>
      )}

      {filterOpen && (
        <FilterDrawer
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={handleFilterApply}
          favoriteIps={[]}
          currentGachaIds={filterGachaIds}
        />
      )}{navOpen && (
        <NavPickerModal lat={spot.lat} lng={spot.lng} name={spot.name} currentPos={currentPos} onClose={() => setNavOpen(false)} />
      )}
    </div>
  );
}
