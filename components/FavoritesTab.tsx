'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import { GachaCard } from '@/components/ui/GachaCard';

interface FavoriteGacha {
  favoriteId: string;
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  status: string;
  releaseDate: string | null;
}

// ─── カード ───────────────────────────────────────────────────────────────────

function FavoriteCard({
  gacha,
  editing,
  deleting,
  onDelete,
  isMobile,
}: {
  gacha: FavoriteGacha;
  editing: boolean;
  deleting: boolean;
  onDelete: () => void;
  isMobile: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className="relative"
      style={{
        opacity: deleting ? 0.4 : 1,
        transform: editing ? 'scale(0.97)' : 'scale(1)',
        transition: 'opacity 0.2s, transform 0.2s',
        pointerEvents: deleting ? 'none' : 'auto',
      }}
    >
      <GachaCard
        gacha={{ ...gacha, likeCount: 0 }}
        rank={0}
        showRank={false}
        isMobile={isMobile}
        variant="favorite"
        fullWidth
        showLike={false}
        onClick={editing || gacha.status === 'ended' ? () => undefined : () => router.push(`/gacha/${gacha.id}`)}
      />
      {editing ? (
        <button
          onClick={onDelete}
          disabled={deleting}
          className="absolute top-3 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-20"
          style={{ background: '#ef4444', border: '2px solid white' }}
        >
          <X size={11} color="white" strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
}

// ─── メイン ───────────────────────────────────────────────────────────────────

export function FavoritesTab({
  userId,
  editable = true,
  hideEnded = false,
}: {
  userId?: string;
  editable?: boolean;
  /** true のとき発売終了(status='ended')のガチャを表示しない（ホームタブ用）。マイページは false のまま。 */
  hideEnded?: boolean;
}) {
  const [gachas,   setGachas]   = useState<FavoriteGacha[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const MOBILE_BREAKPOINT = 768;
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);

  useEffect(() => {
    // 自分＝編集可の自分用API / 他人＝公開API
    const url = editable ? '/api/gacha/favorites' : `/api/users/${userId}/favorites`;
    fetch(url)
      .then(r => r.json())
      .then(d => setGachas(d.gachas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [editable, userId]);

  const handleDelete = async (gachaId: string) => {
    setDeleting(prev => new Set(prev).add(gachaId));
    try {
      await fetch(`/api/gacha/favorites/${gachaId}`, { method: 'DELETE' });
      setGachas(prev => prev.filter(g => g.id !== gachaId));
      // マップのlocalStorageフィルターキャッシュからも削除
      try {
        const stored = JSON.parse(localStorage.getItem('kokosuki_filter_gacha_ids') || '[]') as string[];
        const seed   = JSON.parse(localStorage.getItem('kokosuki_filter_liked_seed_v1') || '[]') as string[];
        localStorage.setItem('kokosuki_filter_gacha_ids',       JSON.stringify(stored.filter(id => id !== gachaId)));
        localStorage.setItem('kokosuki_filter_liked_seed_v1',   JSON.stringify(seed.filter(id => id !== gachaId)));
      } catch {}
    } catch {}
    setDeleting(prev => { const s = new Set(prev); s.delete(gachaId); return s; });
  };

  const cols = isMobile ? 2 : 4;
  // ホームタブ(hideEnded)では発売終了ガチャを非表示。マイページは全件表示。
  const visible = hideEnded ? gachas.filter(g => g.status !== 'ended') : gachas;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between px-4 py-3">
        <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>
          {editable ? '引きたいもの' : 'お気に入り'} {loading ? '…' : `${visible.length}件`}
        </span>
        {editable && !loading && visible.length > 0 && (
          <button
            onClick={() => setEditing(e => !e)}
            style={{ fontSize: 13, fontWeight: 700, color: editing ? '#F2B800' : '#888' }}
          >
            {editing ? '完了' : '編集'}
          </button>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 32, height: 32, border: '3px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            {editable ? (
              <>
                <p style={{ fontSize: 14, color: '#aaa', fontWeight: 600 }}>引きたいガチャを登録しよう</p>
                <p style={{ fontSize: 12, color: '#ccc' }}>ガチャ詳細ページからハートで追加できます</p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: '#aaa', fontWeight: 600 }}>お気に入りはまだありません</p>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 12,
              paddingTop: editing ? 8 : 0,
            }}
          >
            {visible.map(g => (
              <FavoriteCard
                key={g.id}
                gacha={g}
                editing={editing}
                deleting={deleting.has(g.id)}
                onDelete={() => handleDelete(g.id)}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
