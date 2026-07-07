'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';
import { renderWithMentions } from '@/components/PostCard';
import { type Reply } from '@/components/community-types';

export function ReplyCard({
  reply,
  postId,
  isOwn,
  onDelete,
}: {
  reply: Reply;
  postId: string;
  isOwn: boolean;
  onDelete: (id: string) => void;
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
      const res = await fetch('/api/posts/' + postId + '/replies/' + reply.id, { method: 'DELETE' });
      if (res.ok) onDelete(reply.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <Avatar user={reply.user} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900">{reply.user.name}</span>
          <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
          {isOwn && (
            <div className="ml-auto flex items-center gap-1" ref={menuRef}>
              {showMenu && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-400 hover:text-red-500 transition-colors px-1 py-0.5 rounded"
                >
                  {deleting
                    ? <div className="inline-block w-3 h-3 border border-red-300 border-t-transparent rounded-full animate-spin" />
                    : '削除'
                  }
                </button>
              )}
              <button
                onClick={() => setShowMenu((p) => !p)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {renderWithMentions(reply.text)}
        </p>
      </div>
    </div>
  );
}
