'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Navigation, Phone, SlidersHorizontal, Search, X, Gamepad2 } from 'lucide-react';
import FilterDrawer, { loadStoredGachaIds } from '@/components/FilterDrawer';
import { SpotGachaCard, type SpotGachaInfo } from '@/components/SpotGachaCard';
import NavPickerModal from '@/components/NavPickerModal';
import { StockPostCard, type StockFeedPost } from '@/components/StockPostCard';
import { PostCard } from '@/components/PostCard';
import { InlineReplies } from '@/components/InlineReplies';
import { type FeedPost, type FeedItem } from '@/components/community-types';
import { useIsMobile } from '@/lib/useIsMobile';
import { StoreReviews } from '@/components/StoreReviews';

// ─── 型定義 ──────────────────────────────────────────────────

interface SpotData {
  id: string; name: string; address: string;
  lat: number; lng: number;
  phone?: string | null; googleMapsUrl: string | null;
  gachaIds: string[];
  stockMap: Record<string, string>;
}

interface Suggestion {
  label: string;
  type: 'gacha' | 'genre';
}

const STORAGE_KEY = 'mikke_filter_gacha_ids';

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

// ─── StorePosts コンポーネント ─────────────────────────────────

type OpenReply = { id: string; type: 'post' | 'stock' } | null;

function StorePosts({
  spotId,
  filterGachaIds,
  autoOpen,
}: {
  spotId: string;
  filterGachaIds: string[];
  autoOpen?: { id: string; type: 'post' | 'stock' } | null;
}) {
  const [posts,         setPosts]         = useState<FeedItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [openReply,     setOpenReply]     = useState<OpenReply>(null);
  const [autoOpenDone,  setAutoOpenDone]  = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef<number | null>(null);
  const filterRef   = useRef(filterGachaIds);
  filterRef.current = filterGachaIds;
  const loadingRef  = useRef(false);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((d: { user: { id: string } | null }) => { if (d.user?.id) setCurrentUserId(d.user.id); })
      .catch(() => {});
  }, []);

  const load = useCallback(async (page: number, filter: string[]) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const p = new URLSearchParams({ type: 'recommended', spotId, page: String(page) });
      if (filter.length > 0) p.set('filterGachaIds', filter.join(','));
      const res = await fetch('/api/posts/feed?' + p.toString());
      if (!res.ok) return;
      const data: { items: FeedItem[]; nextPage: number | null } = await res.json();
      setPosts(prev => page === 0 ? (data.items ?? []) : [...prev, ...(data.items ?? [])]);
      nextPageRef.current = data.nextPage;
    } catch {}
    loadingRef.current = false;
    if (page === 0) setLoading(false);
  }, [spotId]);

  // フィルター変更 → 先頭から再フェッチ
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    nextPageRef.current = null;
    load(0, filterGachaIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGachaIds.join(','), load]);

  // 無限スクロール
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && nextPageRef.current !== null) {
        load(nextPageRef.current, filterRef.current);
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
    if (nextPageRef.current !== null) {
      load(nextPageRef.current, filterRef.current);
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
      <Gamepad2 size={36} color="#DDD" style={{ margin: '0 auto 8px', display: 'block' }} />
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
                />
              : <PostCard
                  post={p as FeedPost}
                  interactive={false}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onReplyClick={() => toggleReply(p.id, type)}
                  replyOpen={isOpen}
                />
            }
            {isOpen && (
              <InlineReplies
                postId={p.id}
                postType={type}
                currentUserId={currentUserId}
                onCountChange={(delta) => updateReplyCount(p.id, delta)}
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
  const isMobile = useIsMobile();
  // 通知から来たとき（返信欄を開く指定あり）は「口コミ・投稿」タブを初期表示に
  const [activeTab,     setActiveTab]     = useState<'products' | 'posts'>(openReplyId || openReviewId ? 'posts' : 'products');

  // コンテンツ検索
  const [contentQuery,     setContentQuery]     = useState('');
  const [searchGachaIds,   setSearchGachaIds]   = useState<string[]>([]);
  const [activeSearchLabel,setActiveSearchLabel]= useState('');
  const [suggestions,      setSuggestions]      = useState<Suggestion[]>([]);
  const [inputFocused,     setInputFocused]     = useState(false);
  const suggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // URL引き継ぎ: マップの検索を店舗ページに引き継ぐ
  useEffect(() => {
    if (!contentSearchParam) return;
    fetch(`/api/gacha/search?q=${encodeURIComponent(contentSearchParam)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.gachaIds) && data.gachaIds.length > 0) {
          setSearchGachaIds(data.gachaIds);
          setActiveSearchLabel(contentSearchParam);
        }
      })
      .catch(() => {});
  }, [contentSearchParam]);

  const fetchSuggestions = (v: string) => {
    if (suggTimer.current) clearTimeout(suggTimer.current);
    if (!v.trim()) { setSuggestions([]); return; }
    suggTimer.current = setTimeout(async () => {
      try {
        const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        setSuggestions(data.suggestions ?? []);
      } catch {}
    }, 150);
  };

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSuggestions([]);
    try {
      const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      if (Array.isArray(data.gachaIds) && data.gachaIds.length > 0) {
        setSearchGachaIds(data.gachaIds);
        setActiveSearchLabel(q.trim());
        setContentQuery('');
      }
    } catch {}
  }, []);

  const clearSearch = useCallback(() => {
    setSearchGachaIds([]);
    setActiveSearchLabel('');
    setContentQuery('');
    setSuggestions([]);
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
  const searchSet      = searchGachaIds.length > 0 ? new Set(searchGachaIds) : null;
  const isSearchActive = searchSet != null;
  const isFiltered     = filterGachaIds.length > 0;

  const visibleGachas = spot.gachaIds
    .filter(id => {
      if (searchSet != null) return searchSet.has(id) || filterGachaIds.length === 0 || filterGachaIds.includes(id);
      return filterGachaIds.length === 0 || filterGachaIds.includes(id);
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
  const showSuggestions = inputFocused && suggestions.length > 0;

  // 検索ヒット件数（フィルターオフ時は visibleGachas = 全件なので別途カウント）
  const searchMatchCount = searchSet != null
    ? visibleGachas.filter(g => searchSet.has(g.id)).length
    : 0;

  const productCountLabel = isSearchActive && !isFiltered
    ? `取扱商品 ${visibleGachas.length}件 うち検索結果 ${searchMatchCount}件`
    : isSearchActive && isFiltered
    ? `フィルター結果 ${visibleGachas.length}件 うち検索結果 ${searchMatchCount}件`
    : isFiltered
    ? `フィルター結果 ${visibleGachas.length}件`
    : `取扱商品 ${visibleGachas.length}件`;

  // ─── 商品一覧エリア ────────────────────────────────────────────────────
  const ProductsArea = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 商品検索バー */}
      <div style={{ padding: '10px 16px 6px', position: 'relative', flexShrink: 0 }}>
        {isSearchActive ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 99, background: '#E8F0FE', flex: 1, minWidth: 0 }}>
              <Gamepad2 size={14} color="#0891b2" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0891b2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSearchLabel}</span>
            </div>
            <button onClick={clearSearch} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} color="#888" />
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="コンテンツ検索..."
              value={contentQuery}
              onChange={e => { setContentQuery(e.target.value); fetchSuggestions(e.target.value); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(contentQuery); }}
              style={{ width: '100%', paddingLeft: 36, paddingRight: contentQuery ? 36 : 12, paddingTop: 8, paddingBottom: 8, borderRadius: 20, border: '1px solid #E8E8E8', background: '#F5F5F5', outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
            />
            {contentQuery && (
              <button onClick={() => { setContentQuery(''); setSuggestions([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} color="#aaa" />
              </button>
            )}
          </div>
        )}
        {showSuggestions && (
          <div style={{ position: 'absolute', left: 16, right: 16, top: '100%', zIndex: 10, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', background: 'white', border: '1px solid #F0F0F0' }}>
            {suggestions.map((s, i) => (
              <button key={i} onMouseDown={() => runSearch(s.label)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer' }}>
                <Gamepad2 size={13} color="#aaa" />{s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>{productCountLabel}</span>
      </div>
      {/* ガチャグリッド */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 32px' }}>
        {visibleGachas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, color: '#BBB' }}>
            <Gamepad2 size={40} color="#DDD" />
            <p style={{ fontSize: 14, marginTop: 12 }}>該当するガチャがありません</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {visibleGachas.map(g => (
              <SpotGachaCard key={g.id} gacha={g} stockStatus={spot.stockMap[g.id]} highlight={searchSet != null && searchSet.has(g.id)} mode="grid" isMobile={isMobile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── 投稿エリア ────────────────────────────────────────────────────────
  const PostsArea = (
    <div style={{ height: '100%', overflowY: 'scroll', padding: '0 16px 32px', boxSizing: 'border-box' }}>
      {/* 口コミ */}
      <StoreReviews spotId={spotId} autoOpenReviewId={openReviewId} />

      {/* 仕切り */}
      <div style={{ borderTop: '1px solid #F0F0F0', margin: '12px 0' }} />

      {/* みんなの投稿 */}
      <div style={{ padding: '4px 0 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>
          みんなの投稿
        </span>
        {isFiltered && (
          <span style={{ fontSize: 11, color: '#AAA', marginLeft: 6 }}>フィルター中 {filterGachaIds.length}件</span>
        )}
      </div>
      <StorePosts spotId={spotId} filterGachaIds={filterGachaIds} autoOpen={autoOpenPost} />
    </div>
  );

  return (
    <div style={{ height: '100%', background: '#FAFAFA', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ─── ヘッダー ─── */}
      <div style={{ background: 'white', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 16px 6px' : '14px 16px 8px' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: isFiltered ? '#F2B800' : '#F5F3ED', color: isFiltered ? 'white' : '#555', fontSize: 13, fontWeight: 700 }}>
              <SlidersHorizontal size={14} />
              フィルター{isFiltered ? ` (${filterGachaIds.length})` : ''}
            </button>
          </div>
        </div>

        {/* 店舗名 + 住所/距離 + 電話・経路ボタン
            PC: 店名の横に住所・距離を小さく横並び / モバイル: 店名の下に住所・距離を縦積み */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 10, padding: isMobile ? '0 16px 8px' : '0 16px 12px' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'baseline', gap: isMobile ? 3 : 10 }}>
            <h1 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', margin: 0, lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.name}</h1>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 1 : 8 }}>
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

        {/* モバイル: タブ切り替え */}
        {isMobile && (
          <div style={{ display: 'flex', borderTop: '1px solid #F0F0F0' }}>
            {(['products', 'posts'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'none', borderBottom: activeTab === tab ? '2px solid #F2B800' : '2px solid transparent', color: activeTab === tab ? '#F2B800' : '#888' }}>
                {tab === 'products' ? '商品一覧' : '口コミ / 投稿'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── コンテンツ ─── */}
      {isMobile ? (
        // モバイル: アクティブタブのみ表示
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'products' ? ProductsArea : PostsArea}
        </div>
      ) : (
        // デスクトップ: 左右2列
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 左: 商品一覧 */}
          <div style={{ flex: '0 0 55%', borderRight: '1px solid #F0F0F0', overflow: 'hidden' }}>
            {ProductsArea}
          </div>
          {/* 右: みんなの投稿 */}
          <div style={{ flex: '0 0 45%', overflow: 'hidden' }}>
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
