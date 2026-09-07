'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Pencil, Trash2, Send, X, ChevronDown } from 'lucide-react';
import { Avatar, avatarColor, timeAgo } from '@/components/ui/Avatar';
import { renderWithMentions } from '@/components/PostCard';

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
  const [replyOpen,    setReplyOpen]    = useState<Record<string, boolean>>({});
  const [replyTexts,   setReplyTexts]   = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({});
  const [mention, setMention] = useState<{ reviewId: string; query: string } | null>(null);
  const newTextRef = useRef<HTMLTextAreaElement>(null);

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

  const toggleLike = async (reviewId: string) => {
    const d = await fetch(`/api/spots/${spotId}/reviews/${reviewId}/like`, { method: 'POST' })
      .then(r => r.json()).catch(() => null);
    if (!d) return;
    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, likedByMe: !!d.liked, _count: { ...r._count, likes: d.count } } : r
    ));
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('この口コミを削除しますか？')) return;
    // 成功を確認してからUIを更新（失敗を握りつぶすと「消えたように見えて実際は残る」ため）
    const res = await fetch(`/api/spots/${spotId}/reviews/${reviewId}`, { method: 'DELETE' }).catch(() => null);
    if (!res || !res.ok) { alert('削除に失敗しました。時間をおいて再度お試しください。'); return; }
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setTotal(t => t - 1);
    setShown(s => s - 1);
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

  const submitReply = async (reviewId: string) => {
    const text = (replyTexts[reviewId] ?? '').trim();
    if (!text || replySubmitting[reviewId]) return;
    setReplySubmitting(prev => ({ ...prev, [reviewId]: true }));
    try {
      const d = await fetch(`/api/spots/${spotId}/reviews/${reviewId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then(r => r.json());
      if (d.reply) {
        setReviews(prev => prev.map(r =>
          r.id === reviewId ? { ...r, replies: [...r.replies, d.reply] } : r
        ));
        setReplyTexts(prev => ({ ...prev, [reviewId]: '' }));
        // 送信後も返信欄は開いたままにする（連続返信・投稿確認のため）
      }
    } catch {}
    setReplySubmitting(prev => ({ ...prev, [reviewId]: false }));
  };

  const deleteReply = async (reviewId: string, replyId: string) => {
    const res = await fetch(`/api/spots/${spotId}/reviews/${reviewId}/replies/${replyId}`, { method: 'DELETE' }).catch(() => null);
    if (!res || !res.ok) { alert('削除に失敗しました。時間をおいて再度お試しください。'); return; }
    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, replies: r.replies.filter(rp => rp.id !== replyId) } : r
    ));
  };

  // メンション候補（その口コミの投稿者＋返信者。自分は除外・クエリで絞り込み）
  const mentionCandidatesFor = (review: Review) => {
    if (mention?.reviewId !== review.id) return [];
    const q = mention.query.toLowerCase();
    const seen = new Set<string>();
    const out: ReviewReply['user'][] = [];
    for (const u of [review.user, ...review.replies.map(rp => rp.user)]) {
      if (u.id === currentUid || seen.has(u.id)) continue;
      seen.add(u.id);
      if (q === '' || u.name.toLowerCase().includes(q) || (u.profile?.handle?.toLowerCase().includes(q) ?? false)) out.push(u);
    }
    return out.slice(0, 6);
  };

  // 入力欄の末尾の「@クエリ」を「@handle 」に置換して挿入（handle が無ければ名前）
  const insertReplyMention = (reviewId: string, token: string) => {
    setReplyTexts(prev => {
      const cur = prev[reviewId] ?? '';
      const replaced = cur.replace(/(^|\s)@[^@\s]*$/, (m) => `${m.startsWith('@') ? '' : m[0]}@${token} `);
      return { ...prev, [reviewId]: replaced };
    });
    setMention(null);
  };

  const remaining = total - shown;

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>
          口コミ
        </span>
        {total > 0 && (
          <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>{total}件</span>
        )}
      </div>

      {/* 投稿入力エリア */}
      <div style={{ background: 'white', borderRadius: 14, padding: '10px 12px', marginBottom: 12, border: '1.5px solid #E0E0E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <textarea
          ref={newTextRef}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitReview(); } }}
          placeholder="この店舗の口コミ・質問を書く..."
          rows={2}
          style={{
            width: '100%', resize: 'none', border: 'none', background: 'transparent',
            fontSize: 13, outline: 'none', color: '#222', lineHeight: 1.6,
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={submitReview}
            disabled={!newText.trim() || submitting}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: newText.trim() ? '#F2B800' : '#E8E8E8',
              color: newText.trim() ? 'white' : '#BBB',
              fontSize: 12, fontWeight: 700, transition: 'background 0.15s',
            }}
          >
            {submitting
              ? <div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
              : <Send size={12} />
            }
            投稿
          </button>
        </div>
      </div>

      {/* 口コミリスト */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#CCC', fontSize: 13 }}>読み込み中…</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#CCC', fontSize: 12 }}>まだ口コミがありません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map(review => (
            <div key={review.id} id={`review-${review.id}`} style={{ background: 'white', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

              {/* 投稿者行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar user={review.user} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{review.user.name}</span>
                  <span style={{ fontSize: 11, color: '#AAA', marginLeft: 6 }}>{timeAgo(review.createdAt)}</span>
                  {review.updatedAt !== review.createdAt && (
                    <span style={{ fontSize: 10, color: '#CCC', marginLeft: 4 }}>（編集済）</span>
                  )}
                </div>
                {review.userId === currentUid && editingId !== review.id && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => startEdit(review)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: '#AAA' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteReview(review.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: '#F87171' }}>
                      <Trash2 size={13} />
                    </button>
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
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {review.text}
                </p>
              )}

              {/* いいね・返信ボタン */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => toggleLike(review.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 20, color: review.likedByMe ? '#F87171' : '#AAA' }}
                >
                  <Heart size={13} fill={review.likedByMe ? '#F87171' : 'none'} color={review.likedByMe ? '#F87171' : '#AAA'} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{review._count.likes > 0 ? review._count.likes : ''}</span>
                </button>
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

              {/* 返信リスト + 入力: ボタンを押したときだけ開く */}
              {replyOpen[review.id] && (
                <div style={{ marginTop: 10, borderLeft: '2px solid #F0F0F0', paddingLeft: 12 }}>
                  {review.replies.map(rp => (
                    <div key={rp.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8 }}>
                      <Avatar user={rp.user} size={22} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{rp.user.name}</span>
                          <span style={{ fontSize: 10, color: '#BBB' }}>{timeAgo(rp.createdAt)}</span>
                          {rp.userId === currentUid && (
                            <button onClick={() => deleteReply(review.id, rp.id)} style={{ marginLeft: 'auto', padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: '#F87171' }}>
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#444', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {renderWithMentions(rp.text, [review.user.name, ...review.replies.map(x => x.user.name)])}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'flex-end', marginTop: 6 }}>
                    {(() => {
                      const cands = mentionCandidatesFor(review);
                      if (cands.length === 0) return null;
                      return (
                        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 40, marginBottom: 4, background: 'white', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', border: '1px solid #F0F0F0', overflow: 'hidden', zIndex: 20, maxHeight: 160, overflowY: 'auto' }}>
                          {cands.map(u => (
                            <button
                              key={u.id}
                              onMouseDown={e => { e.preventDefault(); insertReplyMention(review.id, u.profile?.handle ?? u.name); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer' }}
                            >
                              <Avatar user={u} size={22} />
                              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{u.name}</span>
                                {u.profile?.handle && <span style={{ fontSize: 11, color: '#AAA' }}>@{u.profile.handle}</span>}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    <input
                      type="text"
                      value={replyTexts[review.id] ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setReplyTexts(prev => ({ ...prev, [review.id]: v }));
                        const m = /(^|\s)@([^@\s]*)$/.exec(v);
                        setMention(m ? { reviewId: review.id, query: m[2] } : null);
                      }}
                      onBlur={() => setTimeout(() => setMention(null), 150)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(review.id); } }}
                      placeholder="返信を入力…（@でメンション）"
                      style={{ flex: 1, border: '1px solid #E8E8E8', borderRadius: 20, padding: '6px 12px', fontSize: 12, outline: 'none' }}
                    />
                    <button
                      onClick={() => submitReply(review.id)}
                      disabled={!(replyTexts[review.id] ?? '').trim() || !!replySubmitting[review.id]}
                      style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: (replyTexts[review.id] ?? '').trim() ? '#F2B800' : '#E8E8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Send size={13} color={(replyTexts[review.id] ?? '').trim() ? 'white' : '#BBB'} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* さらに表示ボタン */}
      {remaining > 0 && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 12, border: '1px solid #E8E8E8',
            background: 'white', fontSize: 12, fontWeight: 700, color: '#888', cursor: 'pointer',
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
