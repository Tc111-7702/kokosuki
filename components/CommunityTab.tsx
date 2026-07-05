'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, Heart, ArrowLeft, Send, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedPost {
  id: string;
  result: string;
  itemName: string | null;
  imageUrl: string | null;
  memo: string | null;
  createdAt: string;
  likedByMe: boolean;
  user: { id: string; name: string; image: string | null };
  spot: { id: string; name: string };
  gacha: { id: string; ipName: string; seriesName: string; gradientFrom: string; gradientTo: string };
  _count: { likes: number; replies: number };
}

interface Reply {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RESULT_BADGE: Record<string, { label: string; cls: string }> = {
  '神引き': { label: '神引き', cls: 'border border-yellow-400 text-yellow-600 bg-yellow-50' },
  '爆死':       { label: '爆死',       cls: 'border border-red-300   text-red-500   bg-red-50'    },
  'ダブり': { label: 'ダブり', cls: 'border border-gray-300  text-gray-500  bg-gray-50'   },
};

// ─── Utils ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return String(Math.floor(diff)) + '秒前';
  if (diff < 3600)  return String(Math.floor(diff / 60)) + '分前';
  if (diff < 86400) return String(Math.floor(diff / 3600)) + '時間前';
  return String(Math.floor(diff / 86400)) + '日前';
}

function avatarColor(name: string): string {
  const colors = ['#F87171','#FB923C','#FBBF24','#34D399','#60A5FA','#818CF8','#E879F9','#F472B6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ user, size = 40 }: { user: { name: string; image: string | null }; size?: number }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, backgroundColor: avatarColor(user.name), fontSize: size * 0.35 }}
    >
      {user.name.charAt(0)}
    </div>
  );
}

// ─── renderWithMentions ───────────────────────────────────────────────────────

function renderWithMentions(text: string) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

// ─── PostCard ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onSelect,
  interactive = true,
}: {
  post: FeedPost;
  onSelect?: (post: FeedPost) => void;
  interactive?: boolean;
}) {
  const router = useRouter();
  const badge    = RESULT_BADGE[post.result];
  const gradient = 'linear-gradient(135deg, ' + post.gacha.gradientFrom + ', ' + post.gacha.gradientTo + ')';

  const [liked,     setLiked]     = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [pending,   setPending]   = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending) return;
    setLiked((p) => !p);
    setLikeCount((p) => liked ? p - 1 : p + 1);
    setPending(true);
    try {
      const res = await fetch('/api/posts/' + post.id + '/like', { method: 'POST' });
      if (res.ok) {
        const data: { liked: boolean; likeCount: number } = await res.json();
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        setLiked((p) => !p);
        setLikeCount((p) => liked ? p + 1 : p - 1);
      }
    } catch {
      setLiked((p) => !p);
      setLikeCount((p) => liked ? p + 1 : p - 1);
    } finally {
      setPending(false);
    }
  };

  return (
    <article
      className={'mx-3 my-2.5 px-4 py-4 bg-white rounded-2xl shadow-sm transition-shadow ' + (interactive ? 'hover:shadow-md cursor-pointer' : '')}
      onClick={() => interactive && onSelect?.(post)}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar user={post.user} size={40} />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-gray-900 truncate">{post.user.name}</span>
          <span className="text-xs text-gray-400 ml-2">{timeAgo(post.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); router.push('/search/genre?ipName=' + encodeURIComponent(post.gacha.ipName) + '&label=' + encodeURIComponent(post.gacha.ipName)); }}
            className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium hover:bg-yellow-200 transition-colors"
          >
            {post.gacha.ipName}
          </button>
          {badge && (
            <span className={'text-xs px-2 py-1 rounded-full font-semibold ' + badge.cls}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] sm:aspect-[2/1] rounded-2xl overflow-hidden mb-3" style={{ background: gradient }}>
        {post.imageUrl && (
          <Image
            src={post.imageUrl}
            alt={post.gacha.seriesName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 560px"
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/40 to-transparent">
          <span className="text-white text-sm font-semibold drop-shadow">
            {post.gacha.seriesName}
          </span>
        </div>
      </div>

      <div className="mb-1">
        <button
          onClick={e => { e.stopPropagation(); router.push('/gacha/' + post.gacha.id); }}
          className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
        >
          {post.gacha.seriesName}
        </button>
        {post.itemName && (
          <span className="ml-1.5 text-xs text-gray-500">{post.itemName}</span>
        )}
      </div>

      {post.memo && <p className="text-sm text-gray-700 mb-2 leading-relaxed">{post.memo}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-1.5">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} />
          <span>{post.spot.name}</span>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <MessageCircle size={20} />
            <span className="font-medium">{post._count.replies}</span>
          </div>
          <button
            onClick={handleLike}
            disabled={pending}
            className={'flex items-center gap-1.5 text-sm px-2 py-1 -mr-2 rounded-full transition-colors ' + (liked ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-red-400')}
          >
            <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
            <span className="font-medium">{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── ReplyCard ────────────────────────────────────────────────────────────────

function ReplyCard({
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

// ─── PostDetail ───────────────────────────────────────────────────────────────

function PostDetail({ post, onBack }: { post: FeedPost; onBack: () => void }) {
  const [replies,          setReplies]          = useState<Reply[]>([]);
  const [loadingR,         setLoadingR]         = useState(true);
  const [text,             setText]             = useState('');
  const [submitting,       setSubmitting]       = useState(false);
  const [currentUid,       setCurrentUid]       = useState<string | null>(null);
  const [mentionQuery,     setMentionQuery]     = useState<string | null>(null);
  const [insertedMentions, setInsertedMentions] = useState<string[]>([]);

  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d: { user: { id: string; name: string } | null }) => setCurrentUid(d.user?.id ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingR(true);
    fetch('/api/posts/' + post.id + '/replies')
      .then((r) => r.json())
      .then((d: { replies: Reply[] }) => { if (!cancelled) { setReplies(d.replies); setLoadingR(false); } })
      .catch(() => { if (!cancelled) setLoadingR(false); });
    return () => { cancelled = true; };
  }, [post.id]);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q    = mentionQuery.toLowerCase();
    const seen = new Set<string>();
    const result: { id: string; name: string; image: string | null }[] = [];
    if (post.user.id !== currentUid) {
      if (q === '' || post.user.name.toLowerCase().includes(q)) result.push(post.user);
      seen.add(post.user.id);
    }
    for (const r of replies) {
      if (r.user.id === currentUid || seen.has(r.user.id)) continue;
      seen.add(r.user.id);
      if (q === '' || r.user.name.toLowerCase().includes(q)) result.push(r.user);
    }
    return result;
  }, [replies, mentionQuery, currentUid, post.user.id, post.user.name, post.user.image]);

  const closeMention = useCallback(() => {
    mentionStartRef.current = null;
    setMentionQuery(null);
  }, []);

  const updateMentionState = useCallback((val: string, cursor: number) => {
    const ms = mentionStartRef.current;
    if (ms !== null) {
      if (val[ms] !== '@' || cursor <= ms) {
        mentionStartRef.current = null;
        setMentionQuery(null);
      } else {
        setMentionQuery(val.slice(ms + 1, cursor));
      }
    } else {
      if (cursor > 0 && val[cursor - 1] === '@') {
        const prev = cursor >= 2 ? val[cursor - 2] : ' ';
        if (prev === ' ' || prev === '\n' || cursor === 1) {
          mentionStartRef.current = cursor - 1;
          setMentionQuery('');
        }
      }
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setText(val);
    updateMentionState(val, cursor);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el     = e.currentTarget;
    const cursor = el.selectionStart ?? 0;
    updateMentionState(el.value, cursor);
  };

  const insertMention = (name: string) => {
    const el = textareaRef.current;
    const ms = mentionStartRef.current;
    if (!el || ms === null) return;
    const cursor  = el.selectionStart ?? text.length;
    const newText = text.slice(0, ms) + '@' + name + ' ' + text.slice(cursor);
    setText(newText);
    setInsertedMentions((prev) => prev.includes('@' + name) ? prev : [...prev, '@' + name]);
    mentionStartRef.current = null;
    setMentionQuery(null);
    setTimeout(() => {
      el.focus();
      const pos = ms + name.length + 2;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const renderMentionText = useCallback((t: string): React.ReactNode => {
    if (insertedMentions.length === 0) return t;
    const escaped = [...insertedMentions]
      .sort((a, b) => b.length - a.length)
      .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp('(' + escaped.join('|') + ')', 'g');
    return t.split(regex).map((part, i) =>
      insertedMentions.includes(part)
        ? <span key={i} className="text-blue-500 font-medium">{part}</span>
        : <span key={i}>{part}</span>
    );
  }, [insertedMentions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && e.key === 'Escape') {
      e.preventDefault();
      closeMention();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/posts/' + post.id + '/replies', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data: { reply: Reply } = await res.json();
        setReplies((prev) => [...prev, data.reply]);
        setText('');
        setInsertedMentions([]);
        mentionStartRef.current = null;
        setMentionQuery(null);
        textareaRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = useCallback((replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F5F5F0]">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-bold text-gray-900">{'返信'}</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <PostCard post={post} interactive={false} />
        <div className="mx-4 border-t border-gray-200 mt-1 mb-2" />
        <div className="bg-white mx-3 rounded-2xl overflow-hidden shadow-sm">
          {loadingR ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">{'まだ返信がありません'}</p>
          ) : (
            replies.map((r) => (
              <ReplyCard
                key={r.id}
                reply={r}
                postId={post.id}
                isOwn={r.user.id === currentUid}
                onDelete={handleDeleteReply}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-shrink-0 relative">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20 max-h-44 overflow-y-auto">
            {mentionCandidates.map((u) => (
              <button
                key={u.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(u.name); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left"
              >
                <Avatar user={u} size={28} />
                <span className="text-sm font-medium text-gray-800">{u.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3">
          <div className="relative flex-1 rounded-2xl border border-gray-200 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 bg-white transition-colors overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 px-4 py-2.5 text-sm whitespace-pre-wrap break-words pointer-events-none text-gray-800 overflow-hidden"
              style={{ lineHeight: '1.5', fontFamily: 'inherit' }}
            >
              {renderMentionText(text)}
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onSelect={handleSelect}
              onKeyDown={handleKeyDown}
              placeholder={'返信する…'}
              rows={2}
              className="relative w-full resize-none bg-transparent px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none"
              style={{ lineHeight: '1.5', color: 'transparent', caretColor: '#374151' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-yellow-400 text-white disabled:opacity-40 hover:bg-yellow-500 transition-colors"
          >
            {submitting
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={18} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

type FeedPhase = 'favorite' | 'all';

function Feed({
  feedType,
  onSelect,
}: {
  feedType: 'recommended' | 'following';
  onSelect: (post: FeedPost) => void;
}) {
  const [posts,         setPosts]         = useState<FeedPost[]>([]);
  const [skip,          setSkip]          = useState(0);
  const [phase,         setPhase]         = useState<FeedPhase>('favorite');
  const [loading,       setLoading]       = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef  = useRef(false);

  const load = useCallback(
    async (currentSkip: number, currentPhase: FeedPhase) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const p = new URLSearchParams({ type: feedType, skip: String(currentSkip) });
        if (feedType === 'recommended') p.set('phase', currentPhase);
        const res = await fetch('/api/posts/feed?' + p.toString());
        if (res.status === 401) { setHasMore(false); return; }
        if (!res.ok) throw new Error('fetch failed');
        const data: { posts: FeedPost[]; nextSkip: number | null } = await res.json();
        setPosts((prev) =>
          currentSkip === 0 && currentPhase === 'favorite' ? data.posts : [...prev, ...data.posts]
        );
        if (data.nextSkip !== null) {
          setSkip(data.nextSkip);
        } else if (feedType === 'recommended' && currentPhase === 'favorite') {
          setPhase('all');
          setSkip(0);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [feedType]
  );

  useEffect(() => {
    setPosts([]);
    setSkip(0);
    setPhase('favorite');
    setHasMore(true);
    setInitialLoaded(false);
    loadingRef.current = false;
    load(0, 'favorite');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && initialLoaded) {
          load(skip, phase);
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, initialLoaded, skip, phase, load]);

  if (initialLoaded && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-4xl mb-3">&#127920;</span>
        <p className="text-sm">{'まだ投稿がありません'}</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onSelect={onSelect} />
      ))}
      <div ref={sentinelRef} className="h-1" />
      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-gray-300 py-6">{'すべて読み込みました'}</p>
      )}
    </div>
  );
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────

function RightSidebar() {
  const trendIps = [
    'ポケモン',
    'ONE PIECE',
    'ハイキュー!!',
    'チェンソーマン',
    'HUNTER×HUNTER',
  ];
  return (
    <div className="hidden lg:block w-[480px] xl:w-[560px] flex-shrink-0 pl-6 pr-4 pt-4 h-full overflow-hidden">
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-full px-4 py-2.5 flex items-center gap-2 text-gray-400 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span>Mikke!{'内を検索'}</span>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 font-bold text-gray-900 text-base border-b border-gray-100">
            {'いまアツいIP'}
          </div>
          {trendIps.map((ip, i) => (
            <div key={ip} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
              <p className="text-xs text-gray-400">{i + 1}</p>
              <p className="text-sm font-semibold text-gray-800">{ip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CommunityTab ─────────────────────────────────────────────────────────────

type FeedTab = 'recommended' | 'following';

export function CommunityTab() {
  const [activeTab,    setActiveTab]    = useState<FeedTab>('recommended');
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className="flex-1 min-w-0 bg-[#F5F5F0] overflow-y-auto flex flex-col">
        {selectedPost ? (
          <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} />
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex">
              {([
                { key: 'recommended' as FeedTab, label: 'おすすめ' },
                { key: 'following'   as FeedTab, label: 'フォロー中' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="flex-1 py-4 text-sm font-semibold relative transition-colors"
                  style={{ color: activeTab === key ? '#111' : '#9CA3AF' }}
                >
                  {label}
                  {activeTab === key && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-12 rounded-full"
                      style={{ backgroundColor: '#FBBF24' }}
                    />
                  )}
                </button>
              ))}
            </div>
            <Feed key={activeTab} feedType={activeTab} onSelect={setSelectedPost} />
          </>
        )}
      </div>
      <RightSidebar />
    </div>
  );
}
