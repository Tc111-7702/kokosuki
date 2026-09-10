'use client';

import { useState, useEffect } from 'react';
import { ReplyComposerField } from '@/components/ReplyComposerField';
import { ReplyCard } from '@/components/ReplyCard';
import { Avatar } from '@/components/ui/Avatar';
import { type Reply } from '@/components/community-types';
import { useMentionInput, type MentionUser } from '@/components/useMentionInput';

export function InlineReplies({
  postId,
  postType,
  currentUserId,
  postOwner,
  onCountChange,
  flushX = false,
  compactY = false,
}: {
  postId: string;
  postType: 'post' | 'stock';
  currentUserId?: string;
  postOwner?: MentionUser; // メンション候補に投稿主を含めるため（任意）
  onCountChange?: (delta: number) => void;
  flushX?: boolean;
  compactY?: boolean;
}) {
  const [replies,    setReplies]    = useState<Reply[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const base = postType === 'stock' ? '/api/stock-posts/' : '/api/posts/';

  // メンション候補: 投稿主(あれば)＋返信者。
  const participants: MentionUser[] = [
    ...(postOwner ? [postOwner] : []),
    ...replies.map((r) => r.user),
  ];
  const {
    text, mentionQuery, mentionCandidates, textareaRef,
    handleTextChange, handleSelect, insertMention, renderMentionText, closeMention, reset,
  } = useMentionInput(participants, currentUserId);

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
        reset();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && e.key === 'Escape') { e.preventDefault(); closeMention(); }
  };

  // 保存済みメンション(@handle)は renderWithMentions の @\S+ フォールバックで着色されるため名前一覧のみでよい。
  const mentionNames = [...new Set(replies.map(x => x.user.name))];

  return (
    <div className={(flushX ? 'mx-0' : 'mx-3') + ' -mt-2 ' + (compactY ? 'mb-1' : 'mb-2.5') + ' bg-white rounded-b-2xl shadow-sm overflow-hidden border-t border-gray-100'}>
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
              currentUserId={currentUserId}
              mentionNames={mentionNames}
              onDelete={(id) => {
                setReplies(prev => prev.filter(x => x.id !== id));
                onCountChange?.(-1);
              }}
            />
          ))}
        </div>
      )}

      {/* 返信入力欄（メンション対応） */}
      <div className="relative border-t border-gray-100">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 max-h-44 overflow-y-auto">
            {mentionCandidates.map(u => (
              <button key={u.id} onMouseDown={e => { e.preventDefault(); insertMention(u.profile?.handle ?? u.name); }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left">
                <Avatar user={u} size={28} />
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">{u.name}</span>
                  {u.profile?.handle && <span className="text-xs text-gray-400 truncate">@{u.profile.handle}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="px-3 py-2">
          <ReplyComposerField
            text={text}
            textareaRef={textareaRef}
            onChange={handleTextChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            renderMentionText={renderMentionText}
            onSubmit={handleSubmit}
            submitting={submitting}
            variant="inline"
          />
        </div>
      </div>
    </div>
  );
}
