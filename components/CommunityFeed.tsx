'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StockPostCard, type StockFeedPost } from '@/components/StockPostCard';
import { PostCard } from '@/components/PostCard';
import { type FeedPost, type FeedItem } from '@/components/community-types';

export function Feed({
  feedType,
  onSelect,
  onSelectStock,
  searchGachaIds,
}: {
  feedType: 'recommended' | 'following' | 'search';
  onSelect: (post: FeedPost) => void;
  onSelectStock: (post: StockFeedPost) => void;
  searchGachaIds?: string[];
}) {
  const [posts,         setPosts]         = useState<FeedItem[]>([]);
  const [page,          setPage]          = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const sentinelRef    = useRef<HTMLDivElement>(null);
  const loadingRef     = useRef(false);
  const gachaIdsRef    = useRef<string[]>(searchGachaIds ?? []);
  const userPosRef     = useRef<{ lat: number; lng: number } | null>(null);
  gachaIdsRef.current = searchGachaIds ?? [];

  // 現在地を取得（近い順ソートに使用）
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { userPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { maximumAge: 300000, timeout: 5000 },
    );
  }, []);

  const load = useCallback(
    async (currentPage: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const p = new URLSearchParams({ type: feedType, page: String(currentPage) });
        if (feedType === 'search' && gachaIdsRef.current.length > 0) {
          p.set('gachaIds', gachaIdsRef.current.join(','));
        }
        if (userPosRef.current) {
          p.set('lat', String(userPosRef.current.lat));
          p.set('lng', String(userPosRef.current.lng));
        }
        const res = await fetch('/api/posts/feed?' + p.toString());
        if (res.status === 401) { setHasMore(false); return; }
        if (!res.ok) { setHasMore(false); return; }
        const data: { items: FeedItem[]; nextPage: number | null } = await res.json();
        setPosts((prev) => currentPage === 0 ? data.items : [...prev, ...data.items]);
        if (data.nextPage !== null) {
          setPage(data.nextPage);
        } else {
          setHasMore(false);
        }
      } catch {
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [feedType]
  );

  useEffect(() => {
    setPosts([]);
    setPage(0);
    setHasMore(true);
    setInitialLoaded(false);
    loadingRef.current = false;
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType, searchGachaIds?.join(',')]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && initialLoaded) {
          load(page);
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, initialLoaded, page, load]);

  if (initialLoaded && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-4xl mb-3">&#127920;</span>
        <p className="text-sm">{'まだ投稿がありません'}</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {posts.map((item) =>
        item.postType === 'stock'
          ? <StockPostCard key={`stock-${item.id}`} post={item} onSelect={onSelectStock} />
          : <PostCard key={`post-${item.id}`} post={item as FeedPost} onSelect={onSelect} />
      )}
      <div ref={sentinelRef} className="h-1" />
      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-gray-300 py-6">{'すべて読み込みました'}</p>
      )}
    </div>
  );
}
