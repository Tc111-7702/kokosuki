'use client';

import { useEffect, useState } from 'react';
import { Avatar, timeAgo } from '@/components/ui/Avatar';

type Voice = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
};

/**
 * 今週発売の「楽しみの声」。入力欄＋投稿一覧（新しい順）。
 * いいね・返信なし。1ユーザー何回でも投稿可。自分の投稿は右上に削除ボタン。
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
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setVoices([]);
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
      onCountChange?.(d.voiceUserCount);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (voiceId: string) => {
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

  const canPost = !!text.trim() && !posting;
  const border = isDark ? '#262626' : '#EDE9D8';
  const subColor = isDark ? '#9CA3AF' : '#999';
  const textColor = isDark ? '#E5E5E5' : '#333';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 入力欄 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handlePost(); } }}
          placeholder="発売が楽しみな気持ちを一言…"
          maxLength={200}
          style={{
            flex: 1, height: 44, borderRadius: 14, border: '1px solid ' + border, padding: '0 14px',
            fontSize: 14, background: isDark ? '#0a0a0a' : '#fff', color: textColor, outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost}
          style={{
            height: 44, padding: '0 18px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14,
            background: canPost ? '#F2B800' : (isDark ? '#262626' : '#EDE9D8'),
            color: canPost ? '#3A2B00' : '#AAA', cursor: canPost ? 'pointer' : 'default',
          }}
        >
          {posting ? '送信中…' : '送信'}
        </button>
      </div>

      {/* 一覧 */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#FFFFFF' : '#1A1A1A', margin: '4px 0 10px' }}>
          楽しみにしている声
        </p>
        {voices.length === 0 ? (
          <p style={{ fontSize: 13, color: '#CCC', textAlign: 'center', padding: '16px 0' }}>まだ声がありません</p>
        ) : (
          <div style={{ border: '1px solid ' + border, borderRadius: 16, overflow: 'hidden' }}>
            {voices.map((v, i) => (
              <div key={v.id} style={{ position: 'relative', display: 'flex', gap: 10, padding: '12px 14px', borderTop: i > 0 ? '1px solid ' + border : 'none' }}>
                <Avatar user={v.user} size={32} />
                <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>{v.user.name}</span>
                    <span style={{ fontSize: 11, color: subColor }}>{timeAgo(v.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: textColor, margin: '2px 0 0', lineHeight: 1.5, wordBreak: 'break-word' }}>{v.text}</p>
                </div>
                {currentUserId === v.user.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    aria-label="削除"
                    style={{
                      position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent',
                      color: '#C4483C', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: 2,
                    }}
                  >
                    {deletingId === v.id ? '削除中…' : '削除'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
