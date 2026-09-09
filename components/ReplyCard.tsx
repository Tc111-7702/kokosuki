'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';
import { renderWithMentions } from '@/components/PostCard';
import { type Reply } from '@/components/community-types';

export function ReplyCard({
  reply,
  postId,
  postType = 'post',
  isOwn,
  onDelete,
  mentionNames,
}: {
  reply: Reply;
  postId: string;
  postType?: 'post' | 'stock';
  isOwn: boolean;
  onDelete: (id: string) => void;
  mentionNames?: string[];
}) {
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      const base = postType === 'stock' ? '/api/stock-posts/' : '/api/posts/';
      const res = await fetch(base + postId + '/replies/' + reply.id, { method: 'DELETE' });
      if (res.ok) onDelete(reply.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <Avatar user={reply.user} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate">{reply.user.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(reply.createdAt)}</span>
          <div className="ml-auto flex items-center gap-0.5 flex-shrink-0" ref={menuRef}>
            {isOwn && showMenu && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-red-500 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {deleting ? '削除中…' : '削除'}
              </button>
            )}
            <button
              type="button"
              onClick={() => { if (isOwn) setShowMenu(v => !v); }}
              className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="返信メニュー"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full">
          {renderWithMentions(reply.text, mentionNames)}
        </p>
      </div>
    </div>
  );
}
