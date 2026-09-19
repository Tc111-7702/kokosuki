'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ReplyComposerField } from '@/components/ReplyComposerField';
import { Avatar } from '@/components/ui/Avatar';
import { StockPostCard, type StockFeedPost } from '@/components/StockPostCard';
import { ReplyCard } from '@/components/ReplyCard';
import { type Reply } from '@/components/community-types';
import { useInteractionActions } from '@/components/InteractionStore';

export function StockPostDetail({ post, onBack, onReplied, onDeleted }: { post: StockFeedPost; onBack: () => void; onReplied?: () => void; onDeleted?: (id: string) => void }) {
  // 返信数の同期: コミュニティは InteractionStore(bumpReply)、Provider外(マイページ等)は onReplied。
  const { bumpReply } = useInteractionActions();
  const [replies,    setReplies]    = useState<Reply[]>([]);
  const [loadingR,   setLoadingR]   = useState(true);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [mentionQuery,     setMentionQuery]     = useState<string | null>(null);
  const [insertedMentions, setInsertedMentions] = useState<string[]>([]);

  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then((d: { user: { id: string } | null }) => setCurrentUid(d.user?.id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingR(true);
    fetch('/api/stock-posts/' + post.id + '/replies')
      .then(r => r.json())
      .then((d: { replies: Reply[] }) => { if (!cancelled) { setReplies(d.replies); setLoadingR(false); } })
      .catch(() => { if (!cancelled) setLoadingR(false); });
    return () => { cancelled = true; };
  }, [post.id]);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const seen = new Set<string>();
    const result: { id: string; name: string; image: string | null; profile?: { handle: string | null } | null }[] = [];
    if (post.user.id !== currentUid) {
      if (q === '' || post.user.name.toLowerCase().includes(q) || (post.user.profile?.handle?.toLowerCase().includes(q) ?? false)) result.push(post.user);
      seen.add(post.user.id);
    }
    for (const r of replies) {
      if (r.user.id === currentUid || seen.has(r.user.id)) continue;
      seen.add(r.user.id);
      if (q === '' || r.user.name.toLowerCase().includes(q) || (r.user.profile?.handle?.toLowerCase().includes(q) ?? false)) result.push(r.user);
    }
    return result;
  }, [replies, mentionQuery, currentUid, post.user.id, post.user.name]);

  const closeMention = useCallback(() => { mentionStartRef.current = null; setMentionQuery(null); }, []);

  const updateMentionState = useCallback((val: string, cursor: number) => {
    const ms = mentionStartRef.current;
    if (ms !== null) {
      if (val[ms] !== '@' || cursor <= ms) { mentionStartRef.current = null; setMentionQuery(null); }
      else setMentionQuery(val.slice(ms + 1, cursor));
    } else if (cursor > 0 && val[cursor - 1] === '@') {
      const prev = cursor >= 2 ? val[cursor - 2] : ' ';
      if (prev === ' ' || prev === '\n' || cursor === 1) { mentionStartRef.current = cursor - 1; setMentionQuery(''); }
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; const cursor = e.target.selectionStart ?? val.length;
    setText(val); updateMentionState(val, cursor);
  };
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget; updateMentionState(el.value, el.selectionStart ?? 0);
  };
  const insertMention = (name: string) => {
    const el = textareaRef.current; const ms = mentionStartRef.current;
    if (!el || ms === null) return;
    const cursor = el.selectionStart ?? text.length;
    const newText = text.slice(0, ms) + '@' + name + ' ' + text.slice(cursor);
    setText(newText);
    setInsertedMentions(prev => prev.includes('@' + name) ? prev : [...prev, '@' + name]);
    mentionStartRef.current = null; setMentionQuery(null);
    setTimeout(() => { el.focus(); const pos = ms + name.length + 2; el.setSelectionRange(pos, pos); }, 0);
  };
  const renderMentionText = useCallback((t: string): React.ReactNode => {
    if (insertedMentions.length === 0) return t;
    const escaped = [...insertedMentions].sort((a,b) => b.length - a.length).map(m => m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    const regex = new RegExp('(' + escaped.join('|') + ')','g');
    return t.split(regex).map((part, i) => insertedMentions.includes(part) ? <span key={i} className="text-[#3d9bff] dark:text-[#66b2ff] font-medium">{part}</span> : <span key={i}>{part}</span>);
  }, [insertedMentions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && e.key === 'Escape') { e.preventDefault(); closeMention(); }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim(); if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/stock-posts/' + post.id + '/replies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data: { reply: Reply } = await res.json();
        setReplies(prev => [...prev, data.reply]);
        bumpReply('stock', post.id, 1);
        onReplied?.();
        setText(''); setInsertedMentions([]); mentionStartRef.current = null; setMentionQuery(null);
        textareaRef.current?.focus();
      }
    } finally { setSubmitting(false); }
  };

  const handleDeleteReply = useCallback((replyId: string) => {
    setReplies(prev => prev.filter(r => r.id !== replyId));
    bumpReply('stock', post.id, -1);
  }, [bumpReply, post.id]);

  // メンション着色用の参加者名（投稿主＋返信者。スペース入りの名前も正しく着色するため）
  const mentionNames = [...new Set([post.user.name, ...replies.map(r => r.user.name)])];

  return (
    <div className="flex flex-col h-full community-feed-bg">
      <div className="post-detail-header flex-shrink-0 flex items-center gap-3 px-4 py-3 sticky top-0 z-10">
        <button onClick={onBack} className="post-detail-back-btn flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-bold text-gray-900">{'返信'}</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <StockPostCard
          post={post}
          interactive={false}
          currentUserId={currentUid ?? undefined}
          onDelete={(id) => { onDeleted?.(id); onBack(); }}
        />
        {loadingR ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : replies.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">{'まだ返信がありません'}</p>
        ) : (
          replies.map(r => (
            <ReplyCard key={r.id} reply={r} postId={post.id} postType="stock" variant="card" className="mx-3 my-2.5" isOwn={r.user.id === currentUid} currentUserId={currentUid ?? undefined} onDelete={handleDeleteReply} mentionNames={mentionNames} />
          ))
        )}
      </div>

      <div className="flex-shrink-0 relative">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className="reply-mention-dropdown absolute bottom-full left-4 right-4 mb-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 max-h-44 overflow-y-auto">
            {mentionCandidates.map(u => (
              <button key={u.id} onMouseDown={e => { e.preventDefault(); insertMention(u.profile?.handle ?? u.name); }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left">
                <Avatar user={u} size={28} />
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{u.name}</span>
                  {u.profile?.handle && <span className="text-xs text-gray-400 dark:text-gray-200 truncate">@{u.profile.handle}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="reply-composer-bar px-4 py-2">
          <ReplyComposerField
            text={text}
            textareaRef={textareaRef}
            onChange={handleTextChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            renderMentionText={renderMentionText}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
