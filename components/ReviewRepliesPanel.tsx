'use client';

import { useState } from 'react';
import { ReplyComposerField } from '@/components/ReplyComposerField';
import { ReplyCard } from '@/components/ReplyCard';
import { Avatar } from '@/components/ui/Avatar';
import { type Reply } from '@/components/community-types';
import { useMentionInput, type MentionUser } from '@/components/useMentionInput';

interface ReviewReplyUser {
  id: string;
  name: string;
  image: string | null;
  profile?: { handle: string | null } | null;
}

interface ReviewReply extends Reply {
  userId: string;
  user: ReviewReplyUser;
}

interface ReviewRepliesPanelProps {
  spotId: string;
  reviewId: string;
  reviewAuthor: ReviewReplyUser;
  replies: ReviewReply[];
  currentUserId?: string | null;
  onReplyAdded: (reply: ReviewReply) => void;
  onReplyDeleted: (replyId: string) => void;
}

export function ReviewRepliesPanel({
  spotId,
  reviewId,
  reviewAuthor,
  replies,
  currentUserId,
  onReplyAdded,
  onReplyDeleted,
}: ReviewRepliesPanelProps) {
  const [submitting, setSubmitting] = useState(false);

  const participants: MentionUser[] = [reviewAuthor, ...replies.map(r => r.user)];
  const {
    text, mentionQuery, mentionCandidates, textareaRef,
    handleTextChange, handleSelect, insertMention, renderMentionText, closeMention, reset,
  } = useMentionInput(participants, currentUserId);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/spots/${spotId}/reviews/${reviewId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data: { reply: ReviewReply } = await res.json();
        onReplyAdded(data.reply);
        reset();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && e.key === 'Escape') { e.preventDefault(); closeMention(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const mentionNames = [...new Set([reviewAuthor.name, ...replies.map(x => x.user.name)])];

  return (
    <div className="mt-2.5 -mx-3.5 border-t border-gray-100 overflow-hidden">
      {replies.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-4">まだ返信がありません</p>
      ) : (
        <div>
          {replies.map(rp => (
            <ReplyCard
              key={rp.id}
              reply={rp}
              postId={reviewId}
              postType="review"
              spotId={spotId}
              isOwn={rp.user.id === currentUserId}
              currentUserId={currentUserId ?? undefined}
              mentionNames={mentionNames}
              onDelete={onReplyDeleted}
              compact
            />
          ))}
        </div>
      )}

      <div className="relative border-t border-gray-100">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 max-h-44 overflow-y-auto">
            {mentionCandidates.map(u => (
              <button
                key={u.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); insertMention(u.profile?.handle ?? u.name); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left"
              >
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
            placeholder="返信する…"
            variant="inline"
            plainText
          />
        </div>
      </div>
    </div>
  );
}
