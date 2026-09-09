'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { type FeedPost } from '@/components/community-types';
import { useInteraction } from '@/components/InteractionStore';
import { Avatar, timeAgo } from '@/components/ui/Avatar';

export const RESULT_BADGE: Record<string, { label: string; cls: string }> = {
  '神引き': { label: '● 神引き', cls: 'border border-yellow-400 text-yellow-600 bg-yellow-50'   },
  '爆死':   { label: '● 爆死',   cls: 'border border-red-300   text-red-500   bg-red-100'       },
  'ダブり': { label: '● ダブり', cls: 'border border-blue-200  text-blue-400  bg-blue-50'       },
};

export function renderWithMentions(text: string, names: string[] = []) {
  const escaped = [...new Set(names)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = escaped.length
    ? new RegExp('(@(?:' + escaped.join('|') + ')|@\\S+)', 'g')
    : /(@\S+)/g;
  return text.split(pattern).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export function PostCard({
  post,
  onSelect,
  interactive = true,
  currentUserId,
  onDelete,
  onReplyClick,
  replyOpen,
}: {
  post: FeedPost;
  onSelect?: (post: FeedPost) => void;
  interactive?: boolean;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onReplyClick?: () => void;
  replyOpen?: boolean;
}) {
  const router = useRouter();
  const gradient = 'linear-gradient(135deg, ' + post.gacha.gradientFrom + ', ' + post.gacha.gradientTo + ')';

  const { liked, likeCount, replyCount, toggleLike } = useInteraction('post', post.id, {
    likedByMe: post.likedByMe, likeCount: post._count.likes, replyCount: post._count.replies,
  });
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = !!currentUserId && post.user.id === currentUserId;

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
    if (!window.confirm('この投稿を削除しますか？')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/posts/' + post.id, { method: 'DELETE' });
      if (res.ok) onDelete?.(post.id);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); toggleLike(); };

  return (
    <article
      className={'mx-3 my-2.5 px-4 py-3 bg-white rounded-2xl shadow-sm transition-shadow ' + (interactive ? 'hover:shadow-md cursor-pointer' : '')}
      onClick={() => interactive && onSelect?.(post)}
    >
      <div className="relative mb-2">
        <div className="flex items-start gap-2.5 min-w-0 pr-5">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); router.push('/mypage/' + post.user.id); }}
            className="flex-shrink-0 active:opacity-70"
            aria-label={post.user.name + 'のマイページ'}
          >
            <Avatar user={post.user} size={32} />
          </button>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); router.push('/mypage/' + post.user.id); }}
                className="text-xs lg:text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left truncate"
              >
                {post.user.name}
              </button>
              <span className="text-[10px] lg:text-xs text-gray-400 flex-shrink-0">{timeAgo(post.createdAt)}</span>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); router.push('/gacha/' + post.gacha.id); }}
              className="group text-xs lg:text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left leading-snug line-clamp-2 pb-1 w-full"
            >
              <span className="underline underline-offset-[3px] decoration-gray-900 group-hover:decoration-blue-600 box-decoration-clone">
                {post.gacha.seriesName}
              </span>
            </button>
            {post.itemName && (
              <p className="text-[10px] lg:text-xs text-gray-400 mt-0.5 leading-tight">{post.itemName}</p>
            )}
            {post.gacha.status != null && post.gacha.status !== 'on_sale' && (
              <span className="inline-block mt-1 text-[10px] lg:text-xs px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full font-semibold border border-red-200 text-red-500 bg-red-50">発売中止</span>
            )}
          </div>
        </div>
        <div className="absolute top-0.5 right-0 z-20 flex items-center gap-0.5 flex-row-reverse pointer-events-none" ref={menuRef}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (isOwner) setShowMenu(v => !v);
            }}
            className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors pointer-events-auto"
            aria-label="投稿メニュー"
          >
            <MoreHorizontal size={16} />
          </button>
          {isOwner && showMenu && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-red-500 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap pointer-events-auto shadow-sm"
            >
              {deleting ? '削除中…' : '削除'}
            </button>
          )}
        </div>
      </div>

      {post.memo && (
        <p className="text-xs lg:text-sm text-gray-800 mb-2 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {post.memo}
        </p>
      )}

      {post.imageUrl && (
        <div
          className="relative w-full aspect-[3/2] lg:aspect-[2/1] rounded-2xl overflow-hidden mb-2"
          style={{ background: gradient }}
        >
          <Image
            src={post.imageUrl}
            alt={post.gacha.seriesName}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 480px"
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 min-w-0">
          <MapPin size={11} className="text-gray-400 flex-shrink-0 lg:w-[13px] lg:h-[13px]" />
          <button
            onClick={e => { e.stopPropagation(); router.push('/map?spotId=' + post.spot.id); }}
            className="text-[10px] lg:text-xs text-gray-400 font-normal hover:text-yellow-600 transition-colors text-left leading-tight truncate"
          >
            {post.spot.name}
          </button>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onReplyClick) onReplyClick();
              else if (onSelect) onSelect(post);
            }}
            className={'flex items-center gap-1 transition-colors ' + (replyOpen ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500')}
          >
            <MessageCircle size={18} />
            <span className="text-xs lg:text-sm font-medium">{replyCount}</span>
          </button>
          <button
            onClick={handleLike}
            className={'flex items-center gap-1 transition-colors ' + (liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            <span className="text-xs lg:text-sm font-medium">{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
