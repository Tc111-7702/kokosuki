'use client';

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ReplyCard } from '@/components/ReplyCard';
import { type Reply } from '@/components/community-types';

export function InlineReplies({
  postId,
  postType,
  currentUserId,
  onCountChange,
}: {
  postId: string;
  postType: 'post' | 'stock';
  currentUserId?: string;
  onCountChange?: (delta: number) => void;
}) {
  const [replies,    setReplies]    = useState<Reply[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const base = postType === 'stock' ? '/api/stock-posts/' : '/api/posts/';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(base + postId + '/replies')
      .then(r => r.json())
      .then((d: { replies: Reply[] }) => {
        if (!cancelled) { setReplies(d.replies ?? []); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId, base]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(base + postId + '/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data: { reply: Reply } = await res.json();
        setReplies(prev => [...prev, data.reply]);
        onCountChange?.(1);
        setText('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-3 -mt-2 mb-2.5 bg-white rounded-b-2xl shadow-sm overflow-hidden border-t border-gray-100">
      {/* 返信一覧 */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : replies.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-4">まだ返信がありません</p>
      ) : (
        <div>
          {replies.map(r => (
            <ReplyCard
              key={r.id}
              reply={r}
              postId={postId}
              postType={postType}
              isOwn={r.user.id === currentUserId}
              onDelete={(id) => {
                setReplies(prev => prev.filter(x => x.id !== id));
                onCountChange?.(-1);
              }}
            />
          ))}
        </div>
      )}
      {/* 返信入力欄 */}
      <div className="flex items-end gap-2 px-3 py-2.5 border-t border-gray-100">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="返信する…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-white disabled:opacity-40 hover:bg-yellow-500 transition-colors"
        >
          {submitting
            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send size={14} />
          }
        </button>
      </div>
    </div>
  );
}
