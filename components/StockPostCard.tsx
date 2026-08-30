'use client';

import { useState } from 'react';
import { MapPin, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useInteraction } from '@/components/InteractionStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StockFeedPost {
  postType: 'stock';
  id: string;
  stockStatus: string;
  createdAt: string;
  likedByMe: boolean;
  user: { id: string; name: string; image: string | null };
  spot: { id: string; name: string; address?: string | null };
  gacha: { id: string; ipName: string; seriesName: string; gradientFrom: string; gradientTo: string; imageUrl: string | null; isOnSale?: boolean };
  _count: { likes: number; replies: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return diff.toFixed(0) + '秒前';
  if (diff < 3600) return Math.floor(diff / 60) + '分前';
  if (diff < 86400)return Math.floor(diff / 3600) + '時間前';
  return Math.floor(diff / 86400) + '日前';
}

function Avatar({ user, size }: { user: { name: string; image: string | null }; size: number }) {
  if (user.image) {
    return <img src={user.image} alt={user.name} width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', width: size, height: size, flexShrink: 0 }} />;
  }
  const colors = ['#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#EF4444'];
  const bg = colors[user.name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.42, flexShrink: 0 }}>
      {user.name[0]}
    </div>
  );
}


function extractCity(address: string | undefined | null): string {
  if (!address) return '';
  const m = address.match(/^(.{2,4}[都道府県])(.{2,6}[市区町村])/);
  return m ? m[1] + m[2] : address.slice(0, 8);
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  in_stock:    { label: '在庫あり', bg: '#DCFCE7', color: '#16A34A' },
  out_of_stock:{ label: '在庫なし', bg: '#FEE2E2', color: '#DC2626' },
  // 旧値の後方互換
  available:   { label: '在庫あり', bg: '#DCFCE7', color: '#16A34A' },
  low:         { label: '在庫あり', bg: '#DCFCE7', color: '#16A34A' },
  low_stock:   { label: '在庫あり', bg: '#DCFCE7', color: '#16A34A' },
  empty:       { label: '在庫なし', bg: '#FEE2E2', color: '#DC2626' },
};

// ─── StockPostCard ────────────────────────────────────────────────────────────

export function StockPostCard({
  post,
  interactive = true,
  onSelect,
  currentUserId,
  onDelete,
  onReplyClick,
  replyOpen,
}: {
  post: StockFeedPost;
  interactive?: boolean;
  onSelect?: (p: StockFeedPost) => void;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onReplyClick?: () => void;
  replyOpen?: boolean;
}) {
  const router = useRouter();
  // いいね・返信数はインタラクションストアで一元管理（一覧↔詳細で同期）。
  const { liked, likeCount, replyCount, toggleLike } = useInteraction('stock', post.id, {
    likedByMe: post.likedByMe, likeCount: post._count.likes, replyCount: post._count.replies,
  });
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!currentUserId && post.user.id === currentUserId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('この在庫報告を削除しますか？')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/stock-posts/' + post.id, { method: 'DELETE' });
      if (res.ok) onDelete?.(post.id);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const status = STATUS_CONFIG[post.stockStatus] ?? STATUS_CONFIG.in_stock;
  const gradient = 'linear-gradient(135deg, ' + post.gacha.gradientFrom + ', ' + post.gacha.gradientTo + ')';

  function handleLike(e: React.MouseEvent) { e.stopPropagation(); toggleLike(); }

  return (
    <article
      className={"mx-3 my-2.5 px-4 py-3 bg-white rounded-2xl shadow-sm transition-shadow " + (interactive && onSelect ? "hover:shadow-md cursor-pointer" : "")}
      onClick={() => interactive && onSelect?.(post)}
    >
      {/* 上段: 画像 + メイン情報 */}
      <div className="flex gap-3 items-start">
        {/* ガチャ画像（小） */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 64, height: 64, background: gradient }}
        >
          {post.gacha.imageUrl && (
            <img src={post.gacha.imageUrl} alt={post.gacha.seriesName} className="w-full h-full object-cover" />
          )}
        </div>

        {/* テキスト情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: status.bg, color: status.color }}
            >
              {status.label}
            </span>
            <button
              onClick={e => { e.stopPropagation(); router.push('/search/genre?ipName=' + encodeURIComponent(post.gacha.ipName) + '&label=' + encodeURIComponent(post.gacha.ipName)); }}
              className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium hover:bg-yellow-200 transition-colors"
            >
              {post.gacha.ipName}
            </button>
            {post.gacha.isOnSale === false && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold border border-red-200 text-red-500 bg-red-50">発売中止</span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); router.push('/gacha/' + post.gacha.id); }}
            className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left leading-tight line-clamp-2"
          >
            {post.gacha.seriesName}
          </button>
          <div className="mt-1.5">
            <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
              <MapPin size={13} className="text-gray-500 flex-shrink-0" />
              <button
                onClick={e => { e.stopPropagation(); router.push('/map?spotId=' + post.spot.id); }}
                className="hover:text-yellow-600 hover:underline transition-colors text-left font-bold"
              >
                {post.spot.name}
              </button>
            </div>
            <p className="text-xs text-gray-400 ml-[18px] mt-0.5">{extractCity(post.spot.address)}</p>
          </div>
        </div>
      </div>

      {/* 下段: ユーザー + いいね・返信 */}
      <div className="flex items-center justify-between mt-2.5">
        <button
          onClick={e => { e.stopPropagation(); router.push('/mypage/' + post.user.id); }}
          className="flex items-center gap-2 min-w-0 active:opacity-70"
        >
          <Avatar user={post.user} size={22} />
          <span className="text-xs text-gray-500 font-medium hover:text-blue-600 transition-colors truncate">{post.user.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(post.createdAt)}</span>
        </button>
        <div className="flex items-center gap-4">
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center p-1 rounded-full text-gray-400 hover:text-red-400 transition-colors"
              aria-label="削除"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={(e) => { if (onReplyClick) { e.stopPropagation(); onReplyClick(); } }}
            className={"flex items-center gap-1.5 transition-colors " + (replyOpen ? "text-yellow-500" : "text-gray-400") + (onReplyClick ? " hover:text-yellow-500" : " cursor-default")}
          >
            <MessageCircle size={18} />
            <span className="text-sm font-medium">{replyCount}</span>
          </button>
          <button
            onClick={handleLike}
            className={'flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ' + (liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}
          >
            <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
            <span className="text-sm font-bold">{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
