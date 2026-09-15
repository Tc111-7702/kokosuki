'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';
import { renderWithMentions } from '@/components/PostCard';
import { type Reply } from '@/components/community-types';
import { replyReportTargetType, reportPath } from '@/lib/reportPath';

export function ReplyCard({
  reply,
  postId,
  postType = 'post',
  spotId,
  isOwn,
  currentUserId,
  onDelete,
  mentionNames,
  compact = false,
  variant = 'inline',
  className = '',
}: {
  reply: Reply;
  postId: string;
  postType?: 'post' | 'stock' | 'review';
  spotId?: string;
  isOwn: boolean;
  currentUserId?: string;
  onDelete: (id: string) => void;
  mentionNames?: string[];
  /** 口コミ返信など: 本文サイズに合わせた小さめ表示 */
  compact?: boolean;
  /** inline: 投稿直下の返信ブロック内 / card: 投稿カードと同じ独立カード */
  variant?: 'inline' | 'card';
  className?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canUseMenu = !!currentUserId;
  const isCard = variant === 'card' && !compact;

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

  const handleDelete = async () => {
    if (deleting) return;
    setShowMenu(false);
    setDeleting(true);
    try {
      const url = postType === 'review'
        ? `/api/spots/${spotId}/reviews/${postId}/replies/${reply.id}`
        : `${postType === 'stock' ? '/api/stock-posts/' : '/api/posts/'}${postId}/replies/${reply.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) onDelete(reply.id);
    } finally {
      setDeleting(false);
    }
  };

  const avatarSize = isCard ? 32 : compact ? 28 : 36;
  const nameClass = isCard
    ? 'text-xs lg:text-sm font-bold text-gray-900 truncate'
    : compact
      ? 'text-[12px] font-bold text-gray-900 truncate'
      : 'text-sm font-semibold text-gray-900 truncate';
  const timeClass = isCard
    ? 'text-[10px] lg:text-xs text-gray-400 flex-shrink-0'
    : compact
      ? 'text-[11px] text-gray-400 flex-shrink-0'
      : 'text-xs text-gray-400 flex-shrink-0';
  const bodyClass = isCard
    ? 'text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full'
    : compact
      ? 'text-[13px] leading-[1.7] text-gray-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full'
      : 'text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full';

  const content = (
    <>
      <Avatar user={reply.user} size={avatarSize} />
      <div className="flex-1 min-w-0">
        <div className={`relative ${isCard ? 'pt-0.5' : compact ? 'mb-0.5' : 'mb-1'}`}>
          <div className={`flex items-center min-w-0 pr-5 ${isCard ? 'gap-1.5 mb-0.5' : compact ? 'gap-1.5' : 'gap-2'}`}>
            <span className={nameClass}>{reply.user.name}</span>
            <span className={timeClass}>{timeAgo(reply.createdAt)}</span>
          </div>
          <div
            className="absolute top-0 right-0 z-20 flex items-center gap-0.5 flex-row-reverse pointer-events-none"
            ref={menuRef}
          >
            <button
              type="button"
              onClick={() => { if (canUseMenu) setShowMenu(v => !v); }}
              className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors pointer-events-auto"
              aria-label="返信メニュー"
            >
              <MoreHorizontal size={compact ? 14 : 16} />
            </button>
            {canUseMenu && showMenu && (
              isOwn ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-red-500 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap pointer-events-auto shadow-sm"
                >
                  {deleting ? '削除中…' : '削除'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    router.push(reportPath(replyReportTargetType(postType), reply.id));
                  }}
                  className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap pointer-events-auto shadow-sm"
                >
                  この投稿を報告する
                </button>
              )
            )}
          </div>
        </div>
        <p className={bodyClass}>
          {renderWithMentions(reply.text, mentionNames)}
        </p>
      </div>
    </>
  );

  if (isCard) {
    return (
      <article className={`post-card-shell rounded-2xl shadow-sm px-4 py-3 ${className}`}>
        <div className="flex items-start gap-2.5 min-w-0">
          {content}
        </div>
      </article>
    );
  }

  return (
    <div className={`flex border-b border-gray-100 last:border-0 ${compact ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-3'} ${className}`}>
      {content}
    </div>
  );
}
