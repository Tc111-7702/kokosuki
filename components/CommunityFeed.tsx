'use client';

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StockPostCard, type StockFeedPost } from '@/components/StockPostCard';
import { PostCard } from '@/components/PostCard';
import { type FeedPost, type FeedItem } from '@/components/community-types';

// 親（CommunityTab）から返信数を一覧に反映するための命令的ハンドル
export interface FeedHandle {
  bumpReplies: (id: string, type: 'post' | 'stock') => void;
}

interface FeedResponse {
  stock: StockFeedPost[];
  feed: FeedPost[];
  stockHasMore: boolean;
  feedHasMore: boolean;
}

export const Feed = forwardRef<FeedHandle, {
  feedType: 'recommended' | 'search';
  onSelect: (post: FeedPost) => void;
  onSelectStock: (post: StockFeedPost) => void;
  searchGachaIds?: string[];
  excludeIds?: string[];
}>(function Feed({
  feedType,
  onSelect,
  onSelectStock,
  searchGachaIds,
  excludeIds,
}, ref) {
  // 取得は在庫/通常の2バケツだが、表示はページごとに結合した1本の allItems で持つ
  // （在庫15→通常5→次ページ在庫15…とページ単位でインターリーブされる）。
  const [posts,         setPosts]         = useState<FeedItem[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const sentinelRef  = useRef<HTMLDivElement>(null);
  const loadingRef   = useRef(false);
  // ページングは在庫/通常で独立。取得済み件数(=次のoffset)と続きの有無を保持。
  const stockOffsetRef = useRef(0);
  const feedOffsetRef  = useRef(0);
  const stockMoreRef   = useRef(true);
  const feedMoreRef    = useRef(true);
  const gachaIdsRef    = useRef<string[]>(searchGachaIds ?? []);
  gachaIdsRef.current = searchGachaIds ?? [];

  // 返信投稿時、一覧の該当カードの返信数を+1（リロードせず即時反映）
  useImperativeHandle(ref, () => ({
    bumpReplies: (id, type) => {
      setPosts((prev) => prev.map((item) =>
        item.id === id && item.postType === type
          ? { ...item, _count: { ...item._count, replies: item._count.replies + 1 } }
          : item
      ));
    },
  }), []);

  // 現在ユーザーIDを取得（自分の投稿にゴミ箱を表示するため）
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.user?.id) setCurrentUserId(data.user.id); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    // 尽きたバケツは offset=-1 を送って取得スキップ。両方尽きていれば何もしない。
    const so = stockMoreRef.current ? stockOffsetRef.current : -1;
    const fo = feedMoreRef.current  ? feedOffsetRef.current  : -1;
    if (so < 0 && fo < 0) { setHasMore(false); return; }

    loadingRef.current = true;
    setLoading(true);
    try {
      const p = new URLSearchParams({ type: feedType, stockOffset: String(so), feedOffset: String(fo) });
      if (feedType === 'search' && gachaIdsRef.current.length > 0) {
        p.set('gachaIds', gachaIdsRef.current.join(','));
      }
      const res = await fetch('/api/posts/feed?' + p.toString());
      if (!res.ok) { setHasMore(false); return; }
      const data: FeedResponse = await res.json();

      // このページ分の在庫→通常を結合して末尾に追加（ページ単位のインターリーブ）
      const incoming: FeedItem[] = [
        ...(so >= 0 ? data.stock : []),
        ...(fo >= 0 ? data.feed  : []),
      ];
      setPosts((prev) => {
        const seen = new Set(prev.map((i) => `${i.postType}-${i.id}`));
        return [...prev, ...incoming.filter((i) => !seen.has(`${i.postType}-${i.id}`))];
      });

      if (so >= 0) { stockOffsetRef.current += data.stock.length; stockMoreRef.current = data.stockHasMore; }
      if (fo >= 0) { feedOffsetRef.current  += data.feed.length;  feedMoreRef.current  = data.feedHasMore;  }
      setHasMore(stockMoreRef.current || feedMoreRef.current);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [feedType]);

  // feedType / 検索条件が変わったら全リセットして先頭から読み直す
  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    setInitialLoaded(false);
    stockOffsetRef.current = 0;
    feedOffsetRef.current  = 0;
    stockMoreRef.current   = true;
    feedMoreRef.current    = true;
    loadingRef.current     = false;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType, searchGachaIds?.join(',')]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && initialLoaded) {
          load();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, initialLoaded, load]);

  const removePost = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

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
      {posts.filter((item) => !excludeIds?.includes(item.id)).map((item) =>
        item.postType === 'stock'
          ? <StockPostCard
              key={`stock-${item.id}`}
              post={item}
              onSelect={onSelectStock}
              currentUserId={currentUserId}
              onDelete={removePost}
            />
          : <PostCard
              key={`post-${item.id}`}
              post={item}
              onSelect={onSelect}
              currentUserId={currentUserId}
              onDelete={removePost}
            />
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
});
