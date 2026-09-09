'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import { GachaStatusBadge } from '@/components/ui/GachaCard';

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
}: {
  gacha: FavoriteGacha;
  editing: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const router = useRouter();

  return (
    <div>
      {/* カードの上に小さくIP名（無い場合も1行分の高さを確保して揃える） */}
      <p className="px-0.5 mb-1 truncate" style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{gacha.ipName || ' '}</p>
      <div className="relative">
        <button
          onClick={() => !editing && router.push(`/gacha/${gacha.id}`)}
          className="flex flex-col rounded-2xl overflow-hidden w-full text-left transition-transform"
          style={{
            background: 'white',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            opacity: deleting ? 0.4 : 1,
            transform: editing ? 'scale(0.97)' : 'scale(1)',
            transition: 'opacity 0.2s, transform 0.2s',
            pointerEvents: deleting ? 'none' : 'auto',
          }}
        >
          {/* 画像エリア */}
          <div className="relative w-full" style={{ paddingBottom: '100%' }}>
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})` }}
            />
            {gacha.imageUrl && (
              <img
                src={gacha.imageUrl}
                alt={gacha.seriesName}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* 発売状況タグ（左上） */}
            <div className="absolute top-1.5 left-1.5">
              <GachaStatusBadge status={gacha.status} isMobile />
            </div>
          </div>
          {/* テキスト */}
          <div className="px-2 py-1.5">
            <p style={{ fontSize: 11, color: '#222', fontWeight: 700, lineHeight: 1.3 }} className="line-clamp-2">
              {gacha.seriesName}
            </p>
          </div>
        </button>

        {/* 削除ボタン（編集モード） */}
        {editing && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10"
            style={{ background: '#ef4444', border: '2px solid white' }}
          >
            <X size={11} color="white" strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── メイン ───────────────────────────────────────────────────────────────────

export function FavoritesTab({ userId, editable = true }: { userId?: string; editable?: boolean }) {
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
        const stored = JSON.parse(localStorage.getItem('mikke_filter_gacha_ids') || '[]') as string[];
        const seed   = JSON.parse(localStorage.getItem('mikke_filter_liked_seed_v1') || '[]') as string[];
        localStorage.setItem('mikke_filter_gacha_ids',       JSON.stringify(stored.filter(id => id !== gachaId)));
        localStorage.setItem('mikke_filter_liked_seed_v1',   JSON.stringify(seed.filter(id => id !== gachaId)));
      } catch {}
    } catch {}
    setDeleting(prev => { const s = new Set(prev); s.delete(gachaId); return s; });
  };

  const cols = isMobile ? 2 : 4;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between px-4 py-3">
        <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>
          {editable ? '引きたいもの' : 'おきにいり'} {loading ? '…' : `${gachas.length}件`}
        </span>
        {editable && !loading && gachas.length > 0 && (
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
        ) : gachas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p style={{ fontSize: 22 }}>🎰</p>
            {editable ? (
              <>
                <p style={{ fontSize: 14, color: '#aaa', fontWeight: 600 }}>引きたいガチャを登録しよう</p>
                <p style={{ fontSize: 12, color: '#ccc' }}>ガチャ詳細ページからハートで追加できます</p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: '#aaa', fontWeight: 600 }}>おきにいりはまだありません</p>
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
            {gachas.map(g => (
              <FavoriteCard
                key={g.id}
                gacha={g}
                editing={editing}
                deleting={deleting.has(g.id)}
                onDelete={() => handleDelete(g.id)}
              />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
