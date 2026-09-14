'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useInteraction } from '@/components/InteractionStore';
import { reportPath } from '@/lib/reportPath';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StockFeedPost {
  postType: 'stock';
  id: string;
  stockStatus: string;
  createdAt: string;
  likedByMe: boolean;
  user: { id: string; name: string; image: string | null; profile?: { handle: string | null } | null };
  spot: { id: string; name: string; address?: string | null };
  gacha: { id: string; ipName: string; seriesName: string; gradientFrom: string; gradientTo: string; imageUrl: string | null; status?: string };
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

function hasDisplayIpName(name: string): boolean {
  const n = name.trim();
  return n.length > 0 && n !== '不明';
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
  flushX = false,
  compactY = false,
}: {
  post: StockFeedPost;
  interactive?: boolean;
  onSelect?: (p: StockFeedPost) => void;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onReplyClick?: () => void;
  replyOpen?: boolean;
  flushX?: boolean;
  compactY?: boolean;
}) {
  const router = useRouter();
  // いいね・返信数はインタラクションストアで一元管理（一覧↔詳細で同期）。
  const { liked, likeCount, replyCount, toggleLike } = useInteraction('stock', post.id, {
    likedByMe: post.likedByMe, likeCount: post._count.likes, replyCount: post._count.replies,
  });
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = !!currentUserId && post.user.id === currentUserId;
  const canUseMenu = !!currentUserId;

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowMenu(false);
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
  const showIpButton = hasDisplayIpName(post.gacha.ipName);

  function handleLike(e: React.MouseEvent) { e.stopPropagation(); toggleLike(); }

  return (
    <article
      className={(flushX ? "mx-0" : "mx-3") + " " + (compactY ? "my-1" : "my-2.5") + " px-4 py-3 bg-white rounded-2xl shadow-sm transition-shadow " + (interactive && onSelect ? "hover:shadow-md cursor-pointer" : "")}
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
        <div className="flex-1 min-w-0 relative">
          <div className="absolute -top-1 right-0 z-10 flex items-center gap-0.5" ref={menuRef}>
            {canUseMenu && showMenu && (
              isOwner ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-red-500 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  {deleting ? '削除中…' : '削除'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    router.push(reportPath('stock_post', post.id));
                  }}
                  className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  この投稿を報告する
                </button>
              )
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                if (canUseMenu) setShowMenu(v => !v);
              }}
              className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="投稿メニュー"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className={"flex items-center gap-1.5 flex-nowrap min-w-0 overflow-hidden " + (canUseMenu && showMenu ? 'pr-[72px]' : 'pr-5')}>
            <span
              className="text-[10px] lg:text-xs leading-none px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full font-semibold flex-shrink-0"
              style={{ background: status.bg, color: status.color }}
            >
              {status.label}
            </span>
            {showIpButton && (
              <button
                onClick={e => { e.stopPropagation(); router.push('/home/search?ipName=' + encodeURIComponent(post.gacha.ipName) + '&label=' + encodeURIComponent(post.gacha.ipName)); }}
                className="text-[10px] lg:text-xs leading-none px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium hover:bg-yellow-200 transition-colors flex-shrink-0 whitespace-nowrap"
              >
                {post.gacha.ipName}
              </button>
            )}
            {post.gacha.status != null && post.gacha.status !== 'on_sale' && (
              <span className="text-[10px] lg:text-xs leading-none px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full font-semibold border border-red-200 text-red-500 bg-red-50 flex-shrink-0">発売中止</span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); router.push('/gacha/' + post.gacha.id); }}
            className="group text-xs lg:text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left leading-snug line-clamp-2 pb-1 w-full"
          >
            <span className="underline underline-offset-[3px] decoration-gray-900 group-hover:decoration-blue-600 box-decoration-clone">
              {post.gacha.seriesName}
            </span>
          </button>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={11} className="text-gray-400 flex-shrink-0 lg:w-[13px] lg:h-[13px]" />
            <button
              onClick={e => { e.stopPropagation(); router.push('/map?spotId=' + post.spot.id); }}
              className="text-[10px] lg:text-xs text-gray-400 font-normal hover:text-yellow-600 transition-colors text-left leading-tight"
            >
              {post.spot.name}
            </button>
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
