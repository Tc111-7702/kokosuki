'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import FilterDrawer from '@/components/FilterDrawer';
import { expandQuery } from '@/lib/gacha-aliases';

type GachaItem = { id: string; seriesName: string; ipName: string; imageUrl: string | null };

// IPごとにグループ化（件数の多い順）
function groupByIp(items: GachaItem[]): [string, GachaItem[]][] {
  const map = new Map<string, GachaItem[]>();
  for (const g of items) {
    const ip = g.ipName || 'その他';
    if (!map.has(ip)) map.set(ip, []);
    map.get(ip)!.push(g);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}

// 店舗に置いてあるガチャから選ぶピッカー（検索バー＋IPごとのグループ表示）
export function SpotGachaPicker({ spotId, filterGachaIds, onSelect, selectedId, initialQuery = '', largeText = false }: {
  spotId: string;
  filterGachaIds: string[];
  onSelect: (id: string, name: string, imageUrl: string | null, lineup: string[]) => void;
  selectedId?: string;
  initialQuery?: string;
  largeText?: boolean;
}) {
  const MOBILE_BREAKPOINT = 768;
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const fs = (base: number) => largeText ? base + 2 : base;
  const [allGachas,       setAllGachas]       = useState<GachaItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [resolving,       setResolving]       = useState<string | null>(null);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>(filterGachaIds);
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [query,           setQuery]           = useState(initialQuery);

  const isFiltered = activeFilterIds.length > 0;

  useEffect(() => {
    Promise.all([
      fetch(`/api/spots/${spotId}`).then(r => r.json()),
      fetch('/api/gacha/filters').then(r => r.json()),
    ]).then(([spotRes, filterRes]) => {
      const gachaIdSet = new Set<string>(spotRes.spot?.gachaIds ?? []);
      setAllGachas((filterRes.items ?? []).filter((g: GachaItem) => gachaIdSet.has(g.id)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [spotId]);

  // 表示セクション（対象は常にこの店舗のガチャのみ）
  // ・検索とフィルターの両方 → 「検索中」「フィルター中」の2セクションで全件表示（検索中が上）
  // ・どちらか一方 → その結果を1セクション
  // ・どちらもなし → 全件
  const sections = useMemo<{ label: string | null; items: GachaItem[] }[]>(() => {
    const raw = query.trim();
    const searchActive = raw.length > 0;
    // カタカナ入力（ワンピース→ONE PIECE 等）にも対応するためエイリアス展開
    const terms = searchActive ? expandQuery(raw).map(t => t.toLowerCase()) : [];
    const filterActive = activeFilterIds.length > 0;
    const filterSet = new Set(activeFilterIds);
    const bySearch = (g: GachaItem) => {
      const s = g.seriesName.toLowerCase();
      const ip = g.ipName.toLowerCase();
      return terms.some(t => s.includes(t) || ip.includes(t));
    };
    const byFilter = (g: GachaItem) => filterSet.has(g.id);

    if (searchActive && filterActive) {
      return [
        { label: '検索中',       items: allGachas.filter(bySearch) },
        { label: 'フィルター中', items: allGachas.filter(byFilter) },
      ];
    }
    if (searchActive) return [{ label: null, items: allGachas.filter(bySearch) }];
    if (filterActive) return [{ label: null, items: allGachas.filter(byFilter) }];
    return [{ label: null, items: allGachas }];
  }, [allGachas, activeFilterIds, query]);

  const totalCount = sections.reduce((n, s) => n + s.items.length, 0);

  const handleSelect = async (g: GachaItem) => {
    setResolving(g.id);
    try {
      const d = await fetch(`/api/gacha/${g.id}`).then(r => r.json());
      onSelect(g.id, g.seriesName, g.imageUrl, d.gacha?.lineup ?? []);
    } catch {
      onSelect(g.id, g.seriesName, g.imageUrl, []);
    }
    setResolving(null);
  };

  const renderPill = (g: GachaItem) => {
    const active = selectedId === g.id || resolving === g.id;
    return (
      <button key={g.id} onClick={() => handleSelect(g)} disabled={!!resolving}
        style={{
          padding: isMobile ? '6px 8px' : '6px 13px', borderRadius: 99, fontSize: fs(12), fontWeight: 600,
          border: active ? '2px solid #F2B800' : '1.5px solid #EDE9D8',
          background: active ? '#FFF8D0' : 'white',
          color: active ? '#8A6800' : '#555',
          cursor: resolving ? 'wait' : 'pointer', transition: 'all 0.12s',
          opacity: resolving && resolving !== g.id ? 0.45 : 1,
        }}>
        {resolving === g.id
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, border: '2px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              {g.seriesName}
            </span>
          : g.seriesName}
      </button>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  return (
    <div>
      {/* 検索バー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F5F3ED', borderRadius: 10, marginBottom: 8 }}>
        <Search size={14} color="#aaa" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ガチャ名・IPで検索…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: fs(13), color: '#333', minWidth: 0 }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <X size={13} color="#bbb" />
          </button>
        )}
      </div>

      {/* フィルター行（マップと同じUI） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setFilterOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            background: isFiltered ? '#F2B800' : '#F5F3ED', color: isFiltered ? 'white' : '#888',
            fontSize: fs(13), fontWeight: 700,
          }}>
          <SlidersHorizontal size={13} />
          {isFiltered ? `フィルター中 (${activeFilterIds.length})` : 'フィルター'}
        </button>
        {isFiltered && (
          <button onClick={() => setActiveFilterIds([])}
            style={{ fontSize: fs(12), padding: '6px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: '#FFF0C0', color: '#B8860B', fontWeight: 700 }}>
            解除
          </button>
        )}
        <span style={{ fontSize: fs(11), color: '#aaa', marginLeft: 'auto' }}>{totalCount}件</span>
      </div>

      {/* 一覧（セクション → IPグループ → ピル） */}
      {totalCount === 0 ? (
        <p style={{ color: '#aaa', fontSize: fs(13), textAlign: 'center', padding: '20px 0' }}>
          該当するガチャがありません
        </p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 2 }}>
          {sections.map((sec) => (
            <div key={sec.label ?? 'all'}>
              {sec.label && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    fontSize: fs(12), fontWeight: 800, padding: '3px 12px', borderRadius: 99,
                    color: sec.label === '検索中' ? '#0891b2' : '#B8860B',
                    background: sec.label === '検索中' ? '#E0F2FE' : '#FFF0C0',
                  }}>
                    {sec.label}
                  </span>
                  <span style={{ fontSize: fs(11), color: '#bbb' }}>{sec.items.length}件</span>
                </div>
              )}
              {sec.items.length === 0 ? (
                <p style={{ color: '#ccc', fontSize: fs(12), padding: '2px 0 4px' }}>該当なし</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {groupByIp(sec.items).map(([ip, items]) => (
                    <div key={ip}>
                      <p style={{ margin: '0 0 6px', fontSize: fs(11), fontWeight: 800, color: '#888', letterSpacing: 0.3 }}>
                        {ip} <span style={{ color: '#ccc', fontWeight: 600 }}>({items.length})</span>
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {items.map(renderPill)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filterOpen && (
        <FilterDrawer
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={ids => { setActiveFilterIds(ids); setFilterOpen(false); }}
          favoriteIps={[]}
          currentGachaIds={activeFilterIds}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
