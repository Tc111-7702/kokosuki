'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { useRouter } from 'next/navigation';
import { MessageCircle, MoreHorizontal, Pencil, X, ChevronDown } from 'lucide-react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';
import { ReplyComposerField } from '@/components/ReplyComposerField';
import { ReviewRepliesPanel } from '@/components/ReviewRepliesPanel';
import { reportPath } from '@/lib/reportPath';

interface ReviewReply {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; profile?: { handle: string | null } | null };
}

interface Review {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  likedByMe: boolean;
  _count: { likes: number };
  replies: ReviewReply[];
  user: { id: string; name: string; image: string | null; profile?: { handle: string | null } | null };
}

export function StoreReviews({ spotId, autoOpenReviewId }: { spotId: string; autoOpenReviewId?: string | null }) {
  const router = useRouter();
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const reviewCardStyle: React.CSSProperties = isDark
    ? { background: '#0a0a0a', border: '1px solid #262626', boxShadow: 'none' }
    : { background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
  const [reviews,      setReviews]      = useState<Review[]>([]);
  const [autoOpenDone, setAutoOpenDone] = useState(false);
  const [total,        setTotal]        = useState(0);
  const [shown,        setShown]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [currentUid,   setCurrentUid]   = useState<string | null>(null);
  const [newText,      setNewText]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editText,     setEditText]     = useState('');
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const newTextRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  useEffect(() => {
    fetch('/api/me').then(r => r.json())
      .then(d => setCurrentUid(d.user?.id ?? null)).catch(() => {});
    fetch(`/api/spots/${spotId}/reviews?skip=0&take=3`)
      .then(r => r.json())
      .then(d => { setReviews(d.items ?? []); setTotal(d.total ?? 0); setShown(d.items?.length ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spotId]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await fetch(`/api/spots/${spotId}/reviews?skip=${shown}&take=10`).then(r => r.json());
      const newItems: Review[] = d.items ?? [];
      setReviews(prev => [...prev, ...newItems]);
      setTotal(d.total ?? total);
      setShown(s => s + newItems.length);
    } catch {}
    setLoadingMore(false);
  };

  // 通知から来たとき: 対象口コミを見つけるまで読み込み、見つかったら返信欄を開いてスクロール
  useEffect(() => {
    if (!autoOpenReviewId || autoOpenDone || loading) return;
    if (reviews.some(r => r.id === autoOpenReviewId)) {
      const t = setTimeout(() => {
        setReplyOpen(prev => ({ ...prev, [autoOpenReviewId]: true }));
        setAutoOpenDone(true);
        document.getElementById(`review-${autoOpenReviewId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(t);
    }
    if (shown < total) {
      loadMore();
    } else {
      const t = setTimeout(() => setAutoOpenDone(true), 0);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenReviewId, autoOpenDone, loading, reviews, shown, total]);

  const submitReview = async () => {
    const text = newText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const d = await fetch(`/api/spots/${spotId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then(r => r.json());
      if (d.review) {
        setReviews(prev => [d.review, ...prev]);
        setTotal(t => t + 1);
        setShown(s => s + 1);
        setNewText('');
      }
    } catch {}
    setSubmitting(false);
  };

  const deleteReview = async (reviewId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpenId(null);
    if (!window.confirm('この口コミを削除しますか？')) return;
    setDeletingId(reviewId);
    try {
      const res = await fetch(`/api/spots/${spotId}/reviews/${reviewId}`, { method: 'DELETE' }).catch(() => null);
      if (!res || !res.ok) { alert('削除に失敗しました。時間をおいて再度お試しください。'); return; }
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotal(t => t - 1);
      setShown(s => s - 1);
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (r: Review) => { setEditingId(r.id); setEditText(r.text); };

  const saveEdit = async (reviewId: string) => {
    const text = editText.trim();
    if (!text) return;
    const d = await fetch(`/api/spots/${spotId}/reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(r => r.json()).catch(() => null);
    if (d?.review) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, text: d.review.text, updatedAt: d.review.updatedAt } : r));
      setEditingId(null);
    }
  };

  const remaining = total - shown;

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
          口コミ
        </span>
        {total > 0 && (
          <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>{total}件</span>
        )}
      </div>

      {/* 投稿入力エリア（マップ SpotDetailSheet と同仕様） */}
      <div style={{ marginBottom: 12 }}>
        <ReplyComposerField
          text={newText}
          textareaRef={newTextRef}
          onChange={e => setNewText(e.target.value)}
          onSelect={() => {}}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitReview(); } }}
          renderMentionText={t => t}
          onSubmit={submitReview}
          submitting={submitting}
          placeholder="この店舗の口コミ・質問を書く..."
          variant="inline"
          plainText
        />
      </div>

      {/* 口コミリスト */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#CCC', fontSize: 13 }}>読み込み中…</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#CCC', fontSize: 12 }}>まだ口コミがありません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map(review => {
            const isOwnReview = review.userId === currentUid;
            const canShowMenu = !!currentUid && editingId !== review.id;
            return (
            <div key={review.id} id={`review-${review.id}`} style={{ ...reviewCardStyle, borderRadius: 14, padding: '12px 14px' }}>

              {/* 投稿者行 */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                    paddingRight: canShowMenu ? 20 : (isOwnReview && editingId !== review.id ? 24 : 0),
                  }}
                >
                  <Avatar user={review.user} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#FFFFFF' : '#333' }}>{review.user.name}</span>
                    <span style={{ fontSize: 11, color: '#AAA', marginLeft: 6 }}>{timeAgo(review.createdAt)}</span>
                    {review.updatedAt !== review.createdAt && (
                      <span style={{ fontSize: 10, color: '#CCC', marginLeft: 4 }}>（編集済）</span>
                    )}
                  </div>
                </div>
                {isOwnReview && editingId !== review.id && (
                  <button
                    type="button"
                    onClick={() => startEdit(review)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: canShowMenu ? 20 : 0,
                      padding: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 6,
                      color: '#AAA',
                      zIndex: 10,
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {canShowMenu && (
                  <div
                    ref={menuOpenId === review.id ? menuRef : undefined}
                    className="absolute top-0 right-0 z-20 flex items-center gap-0.5 flex-row-reverse pointer-events-none"
                  >
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setMenuOpenId(id => id === review.id ? null : review.id); }}
                      className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors pointer-events-auto"
                      aria-label="口コミメニュー"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpenId === review.id && (
                      isOwnReview ? (
                        <button
                          type="button"
                          onClick={e => deleteReview(review.id, e)}
                          disabled={deletingId === review.id}
                          className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-red-500 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap shadow-sm pointer-events-auto"
                        >
                          {deletingId === review.id ? '削除中…' : '削除'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            router.push(reportPath('spot_review', review.id));
                          }}
                          className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap shadow-sm pointer-events-auto"
                        >
                          この投稿を報告する
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* 本文 or 編集フォーム */}
              {editingId === review.id ? (
                <div style={{ marginBottom: 8 }}>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    autoFocus
                    style={{ width: '100%', resize: 'none', border: '1px solid #E8E8E8', borderRadius: 10, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E0E0E0', background: 'white', fontSize: 12, cursor: 'pointer', color: '#888' }}>
                      <X size={11} style={{ display: 'inline', marginRight: 3 }} />キャンセル
                    </button>
                    <button onClick={() => saveEdit(review.id)} disabled={!editText.trim()} style={{ padding: '4px 12px', borderRadius: 20, border: 'none', background: '#F2B800', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: '0 0 10px', fontSize: 13, color: isDark ? '#d4d4d4' : '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {review.text}
                </p>
              )}

              {/* 返信ボタン（口コミにいいね機能は無し） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setReplyOpen(prev => ({ ...prev, [review.id]: !prev[review.id] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 20, color: '#AAA' }}
                >
                  <MessageCircle size={13} color="#AAA" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#AAA' }}>
                    {replyOpen[review.id]
                      ? '返信を閉じる'
                      : review.replies.length > 0 ? `返信 ${review.replies.length}件` : '答える'}
                  </span>
                </button>
              </div>

              {replyOpen[review.id] && (
                <ReviewRepliesPanel
                  spotId={spotId}
                  reviewId={review.id}
                  reviewAuthor={review.user}
                  replies={review.replies}
                  currentUserId={currentUid}
                  onReplyAdded={reply => {
                    setReviews(prev => prev.map(r =>
                      r.id === review.id ? { ...r, replies: [...r.replies, reply] } : r
                    ));
                  }}
                  onReplyDeleted={replyId => {
                    setReviews(prev => prev.map(r =>
                      r.id === review.id ? { ...r, replies: r.replies.filter(rp => rp.id !== replyId) } : r
                    ));
                  }}
                />
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* さらに表示ボタン */}
      {remaining > 0 && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 12,
            border: isDark ? '1px solid #262626' : '1px solid #E8E8E8',
            background: isDark ? '#0a0a0a' : 'white',
            fontSize: 12, fontWeight: 700, color: isDark ? '#737373' : '#888', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {loadingMore
            ? <div style={{ width: 14, height: 14, border: '2px solid #CCC', borderTopColor: '#F2B800', borderRadius: '50%' }} />
            : <><ChevronDown size={14} />さらに表示（{remaining}件）</>
          }
        </button>
      )}
    </div>
  );
}
