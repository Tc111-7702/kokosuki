'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, ChevronDown, MoreHorizontal, Pencil, X } from 'lucide-react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ReplyComposerField } from '@/components/ReplyComposerField';

type Voice = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
};

const PAGE_SIZE = 4;

/**
 * 今週発売の「楽しみの声」。入力欄＋投稿一覧（新しい順）。1ユーザー何回でも投稿可。
 * 一覧は一度に4件ずつ表示する:
 *  - デスクトップ: 両矢印「ほかの声を見る」で4件ずつページ切り替え（新規登録ガチャ選択と同様）。
 *  - モバイル: 「さらに表示（n件）」で4件ずつ追加表示（店舗詳細の口コミと同様）。
 * 自分の投稿のみ編集(鉛筆)と削除(…メニュー)を表示（店舗詳細の口コミと同じUI）。他人の投稿には何も付けない。
 */
export function WeeklyVoices({
  gachaId,
  isDark,
  onCountChange,
}: {
  gachaId: string;
  isDark: boolean;
  onCountChange?: (n: number) => void;
}) {
  const isMobile = useIsMobile(768);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [page, setPage] = useState(0);   // デスクトップ: 現在ページ
  const [shown, setShown] = useState(PAGE_SIZE); // モバイル: 表示件数
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // デスクトップの入力欄(textarea)を内容に合わせて自動で高さ調整（末尾で折り返し→行が増える）。
  useLayoutEffect(() => {
    if (isMobile) return;
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px'; // 内容に合わせて伸ばす（上限なし・スクロールバーを出さない）
  }, [text, isMobile]);

  useEffect(() => {
    let alive = true;
    setVoices([]); setPage(0); setShown(PAGE_SIZE);
    fetch('/api/gacha/' + gachaId + '/weekly/voice')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setVoices(d.voices ?? []);
        setCurrentUserId(d.currentUserId ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [gachaId]);

  // …メニューの外側クリックで閉じる
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const handlePost = async () => {
    const t = text.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/gacha/' + gachaId + '/weekly/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) return;
      const d = await res.json();
      setVoices((prev) => [d.voice, ...prev]);
      setText('');
      setPage(0); // 自分の投稿（先頭）が見えるよう先頭ページへ
      onCountChange?.(d.voiceUserCount);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (voiceId: string) => {
    setMenuOpenId(null);
    if (!window.confirm('この投稿を削除しますか？')) return;
    setDeletingId(voiceId);
    try {
      const res = await fetch('/api/gacha/' + gachaId + '/weekly/voice/' + voiceId, { method: 'DELETE' });
      if (!res.ok) return;
      const d = await res.json();
      setVoices((prev) => prev.filter((v) => v.id !== voiceId));
      onCountChange?.(d.voiceUserCount);
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (v: Voice) => { setMenuOpenId(null); setEditingId(v.id); setEditText(v.text); };

  const saveEdit = async (voiceId: string) => {
    const t = editText.trim();
    if (!t) return;
    const d = await fetch('/api/gacha/' + gachaId + '/weekly/voice/' + voiceId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t }),
    }).then((r) => r.json()).catch(() => null);
    if (d?.voice) {
      setVoices((prev) => prev.map((v) => (v.id === voiceId ? { ...v, text: d.voice.text } : v)));
      setEditingId(null);
    }
  };

  const canPost = !!text.trim() && !posting;
  const border = isDark ? '#262626' : '#EDE9D8';
  const subColor = isDark ? '#9CA3AF' : '#999';
  const textColor = isDark ? '#E5E5E5' : '#333';

  const pageCount = Math.max(1, Math.ceil(voices.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = isMobile
    ? voices.slice(0, shown)
    : voices.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const remaining = Math.max(0, voices.length - shown);
  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 入力欄: モバイルは送信ボタン埋め込み型（投稿の返信と同じ）、デスクトップは横に送信ボタン。
          いずれも末尾で折り返す（textarea）。 */}
      {isMobile ? (
        <div style={{ padding: '2px 0' }}>
          <ReplyComposerField
            text={text}
            textareaRef={inputRef}
            onChange={(e) => setText(e.target.value)}
            onSelect={() => {}}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void handlePost(); } }}
            renderMentionText={(t) => t}
            onSubmit={handlePost}
            submitting={posting}
            placeholder="発売が楽しみな気持ちを一言…"
            variant="inline"
            plainText
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="発売が楽しみな気持ちを一言…"
            maxLength={200}
            rows={1}
            style={{
              flex: 1, minHeight: 44, borderRadius: 14, border: '1px solid ' + border,
              padding: '11px 14px', fontSize: 14, lineHeight: 1.4, resize: 'none', overflow: 'hidden',
              background: isDark ? '#0a0a0a' : '#fff', color: textColor, outline: 'none',
              whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={handlePost}
            disabled={!canPost}
            style={{
              height: 44, padding: '0 18px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14,
              background: canPost ? '#F2B800' : (isDark ? '#262626' : '#EDE9D8'),
              color: canPost ? '#3A2B00' : '#AAA', cursor: canPost ? 'pointer' : 'default', flexShrink: 0,
            }}
          >
            {posting ? '送信中…' : '送信'}
          </button>
        </div>
      )}

      {/* 一覧 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 10px' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
            楽しみにしている声
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* デスクトップ: 件数の左隣に両矢印「ほかの声を見る」を置く */}
            {!isMobile && voices.length > PAGE_SIZE && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isDark ? '#9CA3AF' : '#64748b' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!canPrev}
                  aria-label="前の声を見る"
                  style={{ padding: 2, background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'default', opacity: canPrev ? 1 : 0.3, color: 'inherit' }}
                >
                  <ChevronsLeft size={20} strokeWidth={2.5} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>ほかの声を見る</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={!canNext}
                  aria-label="次の声を見る"
                  style={{ padding: 2, background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'default', opacity: canNext ? 1 : 0.3, color: 'inherit' }}
                >
                  <ChevronsRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            )}
            {voices.length > 0 && (
              <span style={{ fontSize: 11, color: subColor, fontWeight: 600 }}>{voices.length}件</span>
            )}
          </div>
        </div>

        {voices.length === 0 ? (
          <p style={{ fontSize: 13, color: '#CCC', textAlign: 'center', padding: '16px 0' }}>まだ声がありません</p>
        ) : (
          <>
            <div style={{ border: '1px solid ' + border, borderRadius: 16, overflow: 'hidden' }}>
              {visible.map((v, i) => {
                const isOwn = currentUserId === v.user.id;
                const canShowControls = isOwn && editingId !== v.id;
                return (
                  <div key={v.id} style={{ position: 'relative', display: 'flex', gap: 10, padding: '12px 14px', borderTop: i > 0 ? '1px solid ' + border : 'none' }}>
                    <Avatar user={v.user} size={32} />
                    <div style={{ flex: 1, minWidth: 0, paddingRight: canShowControls ? 44 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>{v.user.name}</span>
                        <span style={{ fontSize: 11, color: subColor }}>{timeAgo(v.createdAt)}</span>
                      </div>

                      {editingId === v.id ? (
                        <div style={{ marginTop: 6 }}>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            autoFocus
                            maxLength={200}
                            style={{
                              width: '100%', resize: 'none', border: '1px solid ' + border, borderRadius: 10,
                              padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                              background: isDark ? '#0a0a0a' : '#fff', color: textColor,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid ' + border, background: isDark ? '#0a0a0a' : 'white', fontSize: 12, cursor: 'pointer', color: '#888' }}
                            >
                              <X size={11} style={{ display: 'inline', marginRight: 3 }} />キャンセル
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(v.id)}
                              disabled={!editText.trim()}
                              style={{ padding: '4px 12px', borderRadius: 20, border: 'none', background: '#F2B800', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: textColor, margin: '2px 0 0', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{v.text}</p>
                      )}
                    </div>

                    {/* 自分の投稿のみ: 編集(鉛筆)＋…メニュー(削除)。他人の投稿には何も付けない。 */}
                    {canShowControls && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(v)}
                          aria-label="編集"
                          style={{ position: 'absolute', top: 10, right: 32, padding: 4, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: '#AAA', zIndex: 10 }}
                        >
                          <Pencil size={13} />
                        </button>
                        <div
                          ref={menuOpenId === v.id ? menuRef : undefined}
                          className="flex items-center gap-0.5 flex-row-reverse pointer-events-none"
                          style={{ position: 'absolute', top: 8, right: 10, zIndex: 20 }}
                        >
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId((id) => (id === v.id ? null : v.id)); }}
                            className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors pointer-events-auto"
                            aria-label="メニュー"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {menuOpenId === v.id && (
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id)}
                              disabled={deletingId === v.id}
                              className="text-[10px] leading-none px-2 py-1 rounded-full bg-gray-200 text-red-500 font-medium hover:bg-gray-100 transition-colors whitespace-nowrap shadow-sm pointer-events-auto"
                            >
                              {deletingId === v.id ? '削除中…' : '削除'}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* モバイルのみ: 一覧下に「さらに表示」（デスクトップの両矢印はヘッダーに配置） */}
            {isMobile && remaining > 0 && (
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE_SIZE)}
                style={{
                  width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 12,
                  border: '1px solid ' + border, background: isDark ? '#0a0a0a' : 'white',
                  fontSize: 12, fontWeight: 700, color: subColor, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                <ChevronDown size={14} />さらに表示（{remaining}件）
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
