'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import type { GachaDetail, NearbySpot } from '@/components/gacha-types';
import { NearbyButton } from '@/components/NearbyButton';
import { LineupSection } from '@/components/LineupSection';
import { StatCard } from '@/components/ui/StatCard';
import { PostCard } from '@/components/PostCard';
import { StockPostCard, type StockFeedPost } from '@/components/StockPostCard';
import { InlineReplies } from '@/components/InlineReplies';
import type { FeedPost } from '@/components/community-types';

const STATUS_LABEL: Record<string, string> = {
  on_sale: '発売中', coming_soon: '発売予定', ended: '終了',
};
// ─── 投稿セクション ────────────────────────────────────────────────────────

type OpenReply = { id: string; type: 'post' | 'stock' } | null;

function GachaPostsSection({ gachaId, isMobile }: { gachaId: string; isMobile: boolean }) {
  const router = useRouter();
  const [posts,         setPosts]         = useState<(FeedPost | StockFeedPost)[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [openReply,     setOpenReply]     = useState<OpenReply>(null);
  // feed API が返す「続きの有無」。true のとき「みんなで見る」でホームへ誘導する。
  const [stockHasMore,  setStockHasMore]  = useState(false);
  const [feedHasMore,   setFeedHasMore]   = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((d: { user: { id: string } | null }) => { if (d.user?.id) setCurrentUserId(d.user.id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/posts/feed?type=search&gachaIds=${gachaId}`)
      .then(r => r.json())
      .then(d => {
        // feed API はバケツ分離（{stock, feed}）で返すのでここで結合する
        const all: (FeedPost | StockFeedPost)[] = [...(d.stock ?? []), ...(d.feed ?? [])];
        all.sort((a, b) =>
          (a.postType === 'stock' ? 0 : 1) - (b.postType === 'stock' ? 0 : 1) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPosts(all);
        setStockHasMore(!!d.stockHasMore);
        setFeedHasMore(!!d.feedHasMore);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gachaId]);

  const toggleReply = (id: string, type: 'post' | 'stock') =>
    setOpenReply(prev => (prev?.id === id ? null : { id, type }));

  const handleDelete = (id: string) =>
    setPosts(prev => prev.filter(p => p.id !== id));

  const updateReplyCount = (id: string, delta: number) =>
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, _count: { ...p._count, replies: p._count.replies + delta } } : p
    ));

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '16px 0', color: '#CCC', fontSize: 13 }}>読み込み中…</div>
  );
  if (posts.length === 0) return (
    <div style={{ textAlign: 'center', padding: '16px 0', color: '#CCC', fontSize: 13 }}>まだ投稿がありません</div>
  );

  // ── モバイル: 在庫優先の縦並び ─────────────────────────────────────────
  if (isMobile) {
    // 1回の取得で在庫≤15＋通常≤5（計≤20）。取得分はそのまま全部表示し、
    // まだ続きがある(hasMore)ときだけ「みんなで見る」でホームへ。
    const hasMore = stockHasMore || feedHasMore;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>このシリーズのみんなの投稿</p>
          {hasMore && (
            <button onClick={() => router.push('/home?tab=community')}
              style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 12, color: '#999', fontWeight: 600 }}>
              みんなで見る <ChevronRight size={14} color="#999" />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {posts.map(p => {
            const type = p.postType as 'post' | 'stock';
            const isOpen = openReply?.id === p.id;
            return (
              <div key={p.id} style={{ marginBottom: isOpen ? 0 : 10 }}>
                {type === 'post'
                  ? <PostCard
                      post={p as FeedPost}
                      interactive={false}
                      currentUserId={currentUserId}
                      onDelete={handleDelete}
                      onReplyClick={() => toggleReply(p.id, type)}
                      replyOpen={isOpen}
                    />
                  : <StockPostCard
                      post={p as StockFeedPost}
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
        </div>
      </div>
    );
  }

  // ── デスクトップ: 左=在庫、右=通常、別々スクロール ──────────────────────
  const stockPosts  = posts.filter(p => p.postType === 'stock') as StockFeedPost[];
  const normalPosts = posts.filter(p => p.postType === 'post')  as FeedPost[];
  const COL_H = 520;

  const colHeader = (title: string, count: number, showMore: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10, padding: '0 2px' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>
        {title}{' '}
        <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>({count})</span>
      </p>
      {showMore && (
        <button onClick={() => router.push('/home?tab=community')}
          style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 11, color: '#AAA', fontWeight: 600 }}>
          みんなで見る <ChevronRight size={12} color="#AAA" />
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {/* 左列: 在庫情報 */}
      <div style={{ flex: 1, minWidth: 0, background: '#F3F4F6', borderRadius: 16, padding: '14px 12px' }}>
        {colHeader('在庫情報', stockPosts.length, stockHasMore)}
        <div style={{ maxHeight: COL_H, overflowY: 'scroll', display: 'flex', flexDirection: 'column', paddingRight: 4 }}>
          {stockPosts.length === 0
            ? <p style={{ fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 24 }}>まだ在庫情報がありません</p>
            : stockPosts.map(p => {
                const isOpen = openReply?.id === p.id;
                return (
                  <div key={p.id} style={{ marginBottom: isOpen ? 0 : 8 }}>
                    <StockPostCard
                      post={p}
                      interactive={false}
                      currentUserId={currentUserId}
                      onDelete={handleDelete}
                      onReplyClick={() => toggleReply(p.id, 'stock')}
                      replyOpen={isOpen}
                    />
                    {isOpen && (
                      <InlineReplies
                        postId={p.id}
                        postType="stock"
                        currentUserId={currentUserId}
                        onCountChange={(delta) => updateReplyCount(p.id, delta)}
                      />
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>
      {/* 右列: 引いた！ */}
      <div style={{ flex: 1, minWidth: 0, background: '#FFF7ED', borderRadius: 16, padding: '14px 12px' }}>
        {colHeader('引いた！', normalPosts.length, feedHasMore)}
        <div style={{ maxHeight: COL_H, overflowY: 'scroll', display: 'flex', flexDirection: 'column', paddingRight: 4 }}>
          {normalPosts.length === 0
            ? <p style={{ fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 24 }}>まだ投稿がありません</p>
            : normalPosts.map(p => {
                const isOpen = openReply?.id === p.id;
                return (
                  <div key={p.id} style={{ marginBottom: isOpen ? 0 : 8 }}>
                    <PostCard
                      post={p as FeedPost}
                      interactive={false}
                      currentUserId={currentUserId}
                      onDelete={handleDelete}
                      onReplyClick={() => toggleReply(p.id, 'post')}
                      replyOpen={isOpen}
                    />
                    {isOpen && (
                      <InlineReplies
                        postId={p.id}
                        postType="post"
                        currentUserId={currentUserId}
                        onCountChange={(delta) => updateReplyCount(p.id, delta)}
                      />
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

// ─── メインページ ──────────────────────────────────────────────────────────

export default function GachaDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [gacha,         setGacha]         = useState<GachaDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [imgRatio,      setImgRatio]      = useState(1);
  const [liked,         setLiked]         = useState(false);
  const [likeCount,     setLikeCount]     = useState(0);
  const [nearbyOpen,    setNearbyOpen]    = useState(false);
  const [nearbySpots,   setNearbySpots]   = useState<NearbySpot[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError,   setNearbyError]   = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch('/api/gacha/' + id)
      .then((r) => r.json())
      .then((d) => setGacha(d.gacha))
      .finally(() => setLoading(false));
    fetch('/api/gacha/' + id + '/like')
      .then((r) => r.json())
      .then((d) => { setLiked(!!d.liked); setLikeCount(d.count ?? 0); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (isMobile) return;
    doFetchNearby();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const doFetchNearby = () => {
    if (nearbySpots.length > 0) return;
    setNearbyLoading(true);
    setNearbyError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(
            '/api/spots/nearby?lat=' + coords.latitude +
            '&lng=' + coords.longitude +
            '&radius=20000&gachaId=' + id
          );
          const d = await r.json();
          setNearbySpots(d.spots ?? []);
        } catch {
          setNearbyError('取得に失敗しました');
        } finally {
          setNearbyLoading(false);
        }
      },
      () => { setNearbyError('位置情報を取得できませんでした'); setNearbyLoading(false); }
    );
  };

  const handleNearby = () => {
    if (nearbyOpen) { setNearbyOpen(false); return; }
    setNearbyOpen(true);
    doFetchNearby();
  };

  const handleLike = async () => {
    const res = await fetch('/api/gacha/' + id + '/like', { method: 'POST' });
    if (!res.ok) return;
    const d = await res.json();
    setLiked(!!d.liked);
    setLikeCount(d.count ?? likeCount);
  };

  const handleSpotClick = (spotId: string) => {
    router.push('/map?spotId=' + spotId + '&highlightGachaId=' + id);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#FFFEEF' }}>
      <p style={{ color: '#C8780A', fontWeight: 700, fontSize: 14 }}>読み込み中...</p>
    </div>
  );

  if (!gacha) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#FFFEEF' }}>
      <p style={{ color: '#999', fontSize: 14 }}>ガチャが見つかりません</p>
    </div>
  );

  const cardW       = 540;
  const imgH        = Math.round(cardW * imgRatio);
  const statusColor = gacha.status === 'on_sale' ? '#22C55E'
    : gacha.status === 'coming_soon' ? '#F59E0B' : '#9CA3AF';

  const tags = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
        background: statusColor, color: '#fff' }}>
        {STATUS_LABEL[gacha.status] ?? gacha.status}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
        background: 'rgba(0,0,0,0.07)', color: '#555' }}>
        ガチャ
      </span>
      {gacha.isReissue && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEF3C7', color: '#D97706' }}>再販</span>}
    </div>
  );

  const titleBlock = (size: number) => (
    <div>
      <p style={{ fontSize: 12, color: '#999', fontWeight: 600, margin: '0 0 4px' }}>{gacha.ipName}</p>
      <h1 style={{ fontSize: size, fontWeight: 900, color: '#1A1A1A', margin: 0, lineHeight: 1.3 }}>
        {gacha.seriesName}
      </h1>
    </div>
  );

  const statsBlock = (cols: number) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: cols === 3 ? 10 : 12 }}>
      <StatCard label="1回の価格"    value={'¥' + gacha.price}          accent="#F2B800" />
      <StatCard label="みんなの投稿" value={String(gacha.postCount)}    />
      <StatCard label="今週引いた"   value={String(gacha.weeklyPulls)}  />
    </div>
  );

  return (
    <div style={{ height: '100%', background: '#FFFEEF', overflowY: 'auto' }}>

      {/* topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,254,239,0.92)', backdropFilter: 'blur(8px)',
      }}>
        <button onClick={() => router.back()} style={{
          width: 36, height: 36, borderRadius: 18, border: 'none',
          background: 'rgba(0,0,0,0.07)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowLeft size={18} color="#555" />
        </button>
        <button onClick={handleLike} style={{
          height: 36, borderRadius: 18, border: 'none', padding: '0 12px',
          background: liked ? 'rgba(255,77,77,0.12)' : 'rgba(0,0,0,0.07)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Heart size={18} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : '#555'} />
          {likeCount > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: liked ? '#FF4D4D' : '#555' }}>
              {likeCount}
            </span>
          )}
        </button>
      </div>

      {isMobile ? (
        /* ── モバイルレイアウト ── */
        <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            background: 'linear-gradient(135deg, ' + gacha.gradientFrom + ', ' + gacha.gradientTo + ')' }}>
            {gacha.imageUrl
              ? <img src={gacha.imageUrl} alt={gacha.seriesName}
                  onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth > 0) setImgRatio(img.naturalHeight / img.naturalWidth); }}
                  style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 48 }}>&#127920;</span>
                </div>
            }
          </div>
          {tags}
          {titleBlock(22)}
          <NearbyButton gacha={gacha} nearbyOpen={nearbyOpen} nearbyLoading={nearbyLoading}
            nearbyError={nearbyError} nearbySpots={nearbySpots}
            onToggle={handleNearby} onSpotClick={handleSpotClick} isMobile={true} />
          {statsBlock(3)}
          <LineupSection gacha={gacha} />
          <GachaPostsSection gachaId={id} isMobile={true} />
        </div>
      ) : (
        /* ── デスクトップレイアウト ── */
        <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
            <div style={{ width: cardW, flexShrink: 0, borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              background: 'linear-gradient(135deg, ' + gacha.gradientFrom + ', ' + gacha.gradientTo + ')',
              minHeight: 320 }}>
              {gacha.imageUrl
                ? <img src={gacha.imageUrl} alt={gacha.seriesName}
                    onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth > 0) setImgRatio(img.naturalHeight / img.naturalWidth); }}
                    style={{ width: '100%', height: imgH || 'auto', objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 48 }}>&#127920;</span>
                  </div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 240, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tags}
              {titleBlock(24)}
              <NearbyButton gacha={gacha} alwaysOpen nearbyOpen={nearbyOpen} nearbyLoading={nearbyLoading}
                nearbyError={nearbyError} nearbySpots={nearbySpots}
                onToggle={handleNearby} onSpotClick={handleSpotClick} isMobile={false} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {statsBlock(3)}
            <LineupSection gacha={gacha} />
            <GachaPostsSection gachaId={id} isMobile={false} />
          </div>
        </div>
      )}
    </div>
  );
}
