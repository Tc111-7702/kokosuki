'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import type { GachaItem } from '@/components/ui/GachaCard';

interface Group {
  ipName: string;
  items: GachaItem[];
}

// おきにいりタブと同じ見た目のカード（正方形画像＋下にIP/シリーズ名）
// badge を渡すとカード左上にタグを表示（候補は渡さない＝タグなし、選択中は section のタグ）
function PickerCard({
  gacha,
  onClick,
  selected = false,
  showDelete = false,
  onDelete,
  badge,
}: {
  gacha: GachaItem;
  onClick?: () => void;
  selected?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  badge?: string;
}) {
  return (
    <div>
      {/* カードの上に小さくIP名 */}
      <p className="px-0.5 mb-1 truncate" style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{gacha.ipName}</p>

      <div className="relative">
        <button
          onClick={onClick}
          className="flex flex-col rounded-2xl overflow-hidden w-full text-left transition-transform"
          style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
        >
          {/* 画像（正方形） */}
          <div className="relative w-full" style={{ paddingBottom: '100%' }}>
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})` }} />
            {gacha.imageUrl && (
              <img
                src={gacha.imageUrl}
                alt={gacha.seriesName}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {badge && (
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white" style={{ fontSize: 9, fontWeight: 700, background: '#4F46E5' }}>
                {badge}
              </div>
            )}
            {selected && (
              <div
                className="absolute inset-0 flex items-start justify-end p-1.5"
                style={{ pointerEvents: 'none', background: 'rgba(242,184,0,0.20)', border: '2.5px solid #F2B800', borderRadius: 16 }}
              >
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: '#F2B800', color: '#fff' }}>✓ 選択中</span>
              </div>
            )}
          </div>
          {/* シリーズ名 */}
          <div className="px-2 py-1.5">
            <p style={{ fontSize: 11, color: '#222', fontWeight: 700, lineHeight: 1.3 }} className="line-clamp-2">{gacha.seriesName}</p>
          </div>
        </button>

        {showDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10"
            style={{ background: '#ef4444', border: '2px solid white' }}
            aria-label="削除"
          >
            <X size={11} color="white" strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}

// 掲載枠の管理パネル（今週発売 / 再販 で共通）。
//  section: API のセクション名（'weekly' | 'reissue'）
//  badge  : 選択中カード＆ホームに付けるタグ文言（'今週発売' | '再販' など）
//  左タブ=候補（IPごとに固まる連続グリッド）／右タブ=選択中（最大10・編集で削除）
export function FeaturedPanel({ section, badge }: { section: string; badge: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<GachaItem[]>([]);
  const [max, setMax] = useState(10);
  const [tab, setTab] = useState<'candidates' | 'selected'>('candidates');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleIpCount, setVisibleIpCount] = useState(3);

  const apiUrl = `/api/admin/home-featured/${section}`;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      const d = await res.json();
      setGroups(d.groups ?? []);
      setSelected(d.selected ?? []);
      if (d.max) setMax(d.max);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);
  useEffect(() => {
    load();
  }, [load]);

  const selectedIds = new Set(selected.map((g) => g.id));

  const remove = async (gachaId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId }),
      });
      if (res.ok) setSelected((await res.json()).selected ?? []);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (g: GachaItem) => {
    if (busy) return;
    if (selectedIds.has(g.id)) return remove(g.id);
    if (selected.length >= max) {
      window.alert(`最大${max}個までです`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId: g.id }),
      });
      if (res.ok) setSelected((await res.json()).selected ?? []);
      else if (res.status === 409) window.alert(`最大${max}個までです`);
    } finally {
      setBusy(false);
    }
  };

  const cols = isMobile ? 2 : 4;
  const gridStyle = { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12 } as const;

  // 検索：IP名一致→そのIP全件、ガチャ名一致→そのガチャのみ
  const q = query.trim().toLowerCase();
  const filteredGroups: Group[] = q
    ? groups
        .map((g) => {
          if (g.ipName.toLowerCase().includes(q)) return g;
          const items = g.items.filter((it) => it.seriesName.toLowerCase().includes(q));
          return items.length ? { ...g, items } : null;
        })
        .filter((g): g is Group => g !== null)
    : groups;
  const shownGroups = q ? filteredGroups : filteredGroups.slice(0, visibleIpCount);
  const canShowMore = !q && filteredGroups.length > visibleIpCount;
  const canCollapse = !q && visibleIpCount > 3;

  const TabButton = ({ k, label }: { k: 'candidates' | 'selected'; label: string }) => {
    const active = tab === k;
    return (
      <button
        type="button"
        onClick={() => setTab(k)}
        className="relative flex-1 pb-2.5 text-[13px] font-bold transition-colors"
        style={{ color: active ? '#F2B800' : '#AAA' }}
      >
        {label}
        {active && (
          <span className="absolute left-0 right-0 bottom-0" style={{ height: 3, borderRadius: 3, background: '#F2B800', boxShadow: '0 0 8px 1px rgba(242,184,0,0.75)' }} />
        )}
      </button>
    );
  };

  if (loading) {
    return <p className="text-[12px] py-4" style={{ color: '#BBB' }}>読み込み中…</p>;
  }

  return (
    <div className="w-full">
      {/* タブ */}
      <div className="flex mb-3" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <TabButton k="candidates" label="候補" />
        <TabButton k="selected" label={`選択中 ${selected.length}/${max}`} />
      </div>

      {/* 候補タブ：検索バー ＋ 連続グリッド（同じIPは隣接） */}
      {tab === 'candidates' && (
        <div>
          <div className="relative mb-4">
            <Search size={16} color="#BBB" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="IP・ガチャを検索"
              className="w-full text-[14px] outline-none"
              style={{ background: 'white', border: '1.5px solid #EDE9D8', borderRadius: 12, padding: '10px 34px 10px 36px' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                aria-label="クリア"
              >
                <X size={15} color="#BBB" />
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {filteredGroups.length === 0 && (
              <p className="text-[12px] py-4" style={{ color: '#BBB' }}>
                {q ? '該当するIP・ガチャがありません。' : '候補のガチャがありません。'}
              </p>
            )}
            <div style={gridStyle} className="mb-4">
              {shownGroups.flatMap((group) => group.items).map((g) => (
                <PickerCard key={g.id} gacha={g} selected={selectedIds.has(g.id)} onClick={() => toggle(g)} />
              ))}
            </div>

            {(canShowMore || canCollapse) && (
              <div className="flex gap-2">
                {canShowMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleIpCount((c) => c + 3)}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-bold active:opacity-80"
                    style={{ background: '#F4F1E4', color: '#888', border: '1.5px solid #EDE9D8' }}
                  >
                    もっと見る（残り{filteredGroups.length - visibleIpCount}IP）
                  </button>
                )}
                {canCollapse && (
                  <button
                    type="button"
                    onClick={() => setVisibleIpCount((c) => Math.max(3, c - 3))}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-bold active:opacity-80"
                    style={{ background: '#FFF', color: '#888', border: '1.5px solid #EDE9D8' }}
                  >
                    閉じる
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 選択中タブ：IP分けなし・編集で削除 */}
      {tab === 'selected' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold" style={{ color: '#888' }}>
              ホームに表示（{selected.length}/{max}）
            </p>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className="text-[12px] font-bold px-3 py-1.5 rounded-lg"
                style={{ background: editing ? '#F2B800' : '#F4F1E4', color: editing ? '#fff' : '#888' }}
              >
                {editing ? '完了' : '編集'}
              </button>
            )}
          </div>

          {selected.length === 0 ? (
            <p className="text-[12px] py-4" style={{ color: '#BBB' }}>
              まだ選択されていません。「候補」タブからガチャを選んでください。
            </p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto" style={{ paddingTop: editing ? 8 : 0 }}>
              <div style={gridStyle}>
                {selected.map((g) => (
                  <PickerCard
                    key={g.id}
                    gacha={g}
                    badge={badge}
                    showDelete={editing}
                    onDelete={() => remove(g.id)}
                    onClick={editing ? () => remove(g.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
