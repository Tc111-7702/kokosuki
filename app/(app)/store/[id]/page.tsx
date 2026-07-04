'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Navigation, Phone, SlidersHorizontal, Search, X, Gamepad2 } from 'lucide-react';
import FilterDrawer, { loadStoredGachaIds } from '@/components/FilterDrawer';
import { SpotGachaCard, type SpotGachaInfo } from '@/components/SpotGachaCard';
import NavPickerModal from '@/components/NavPickerModal';

// ─── 型定義 ──────────────────────────────────────────────────

interface SpotData {
  id: string; name: string; address: string;
  lat: number; lng: number;
  phone?: string | null; googleMapsUrl: string | null;
  gachaIds: string[];
  stockMap: Record<string, string>;
}

interface Suggestion {
  label: string;
  type: 'gacha' | 'genre';
}

const STORAGE_KEY = 'mikke_filter_gacha_ids';

// ─── ユーティリティ ───────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

// ─── メインページ ───────────────────────────────────────────────────

export default function StorePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const spotId = params.id as string;
  const contentSearchParam = searchParams.get('contentSearch') ?? '';

  const [spot, setSpot] = useState<SpotData | null>(null);
  const [gachaMap, setGachaMap] = useState<Map<string, SpotGachaInfo>>(new Map());
  const [filterGachaIds, setFilterGachaIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // コンテンツ検索
  const [contentQuery, setContentQuery] = useState('');          // 入力値
  const [searchGachaIds, setSearchGachaIds] = useState<string[]>([]); // 検索ヒットID
  const [activeSearchLabel, setActiveSearchLabel] = useState(''); // アクティブ検索ラベル
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const suggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // データ取得
  useEffect(() => {
    const stored = loadStoredGachaIds();
    setFilterGachaIds(stored);

    Promise.all([
      fetch(`/api/spots/${spotId}`).then(r => r.json()),
      fetch('/api/gacha/filters').then(r => r.json()),
    ]).then(([spotRes, filterRes]) => {
      if (spotRes.spot) setSpot(spotRes.spot);
      const map = new Map<string, SpotGachaInfo>();
      (filterRes.items ?? []).forEach((g: SpotGachaInfo) => map.set(g.id, g));
      setGachaMap(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [spotId]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  // URL引き継ぎ: マップの検索を店舗ページに引き継ぐ
  useEffect(() => {
    if (!contentSearchParam) return;
    fetch(`/api/gacha/search?q=${encodeURIComponent(contentSearchParam)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.gachaIds) && data.gachaIds.length > 0) {
          setSearchGachaIds(data.gachaIds);
          // data.label はDBの最初のシリーズ名になることがあるので、
          // URLパラメータ（ユーザーの元クエリ）をそのままラベルに使う
          setActiveSearchLabel(contentSearchParam);
        }
      })
      .catch(() => {});
  }, [contentSearchParam]);

  // サジェスト取得
  const fetchSuggestions = (v: string) => {
    if (suggTimer.current) clearTimeout(suggTimer.current);
    if (!v.trim()) { setSuggestions([]); return; }
    suggTimer.current = setTimeout(async () => {
      try {
        const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        setSuggestions(data.suggestions ?? []);
      } catch {}
    }, 150);
  };

  // 検索実行
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSuggestions([]);
    try {
      const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      if (Array.isArray(data.gachaIds) && data.gachaIds.length > 0) {
        setSearchGachaIds(data.gachaIds);
        // data.label はDBの最初のシリーズ名になることがあるので、
        // ユーザーが入力・選択したクエリをそのままラベルに使う
        setActiveSearchLabel(q.trim());
        setContentQuery('');
      }
    } catch {}
  }, []);

  // 検索クリア
  const clearSearch = useCallback(() => {
    setSearchGachaIds([]);
    setActiveSearchLabel('');
    setContentQuery('');
    setSuggestions([]);
  }, []);

  const handleFilterApply = useCallback((ids: string[]) => {
    setFilterGachaIds(ids);
    setFilterOpen(false);
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilterGachaIds([]);
    try { localStorage.setItem(STORAGE_KEY, '[]'); } catch {}
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: '100dvh', color: '#BBB', fontSize: 14, fontWeight: 700 }}>
      読み込み中…
    </div>
  );
  if (!spot) return (
    <div className="flex items-center justify-center" style={{ height: '100dvh', color: '#BBB', fontSize: 14 }}>
      店舗が見つかりません
    </div>
  );

  // ─── 表示商品の計算（検索優先、次いでフィルター）──────────────────────────
  const searchSet = searchGachaIds.length > 0 ? new Set(searchGachaIds) : null;
  const isSearchActive = searchSet != null;
  const isFiltered = filterGachaIds.length > 0;

  const visibleGachas = spot.gachaIds
    .filter(id => {
      if (searchSet != null) {
        // 検索ヒット OR フィルター通過（フィルター未設定なら全件）
        return searchSet.has(id) || filterGachaIds.length === 0 || filterGachaIds.includes(id);
      }
      return filterGachaIds.length === 0 || filterGachaIds.includes(id);
    })
    .map(id => gachaMap.get(id))
    .filter((g): g is SpotGachaInfo => g !== undefined)
    .sort((a, b) => {
      // 検索ヒットを先頭に
      if (searchSet != null) {
        const aS = searchSet.has(a.id), bS = searchSet.has(b.id);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
      }
      return 0;
    });

  const distance = currentPos
    ? haversineM(currentPos.lat, currentPos.lng, spot.lat, spot.lng)
    : null;

  const gridCols = isMobile
    ? 'repeat(auto-fill, minmax(150px, 1fr))'
    : 'repeat(auto-fill, minmax(280px, 1fr))';

  const showSuggestions = inputFocused && suggestions.length > 0;

  // 件数ラベル
  const countLabel = isSearchActive
    ? `検索結果 ${visibleGachas.length}件${isFiltered ? '（フィルター含む）' : ''}`
    : isFiltered
    ? `フィルター結果 ${visibleGachas.length}件`
    : `取扱商品 ${visibleGachas.length}件`;

  return (
    <div style={{ height: '100dvh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5"
            style={{ color: '#0891b2', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={18} />戻る
          </button>
          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={() => handleClearFilter()}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: '#FFF0C0', color: '#B8860B', fontWeight: 700 }}>
                解除
              </button>
            )}
            <button
              onClick={() => setFilterOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: isFiltered ? '#F2B800' : '#F5F3ED',
                color: isFiltered ? 'white' : '#555',
                fontSize: 13, fontWeight: 700,
              }}>
              <SlidersHorizontal size={14} />
              フィルター{isFiltered ? ` (${filterGachaIds.length})` : ''}
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between px-4 pb-3" style={{ gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="text-[18px] font-black leading-tight" style={{ color: '#1a1a1a', margin: '0 0 4px' }}>
              {spot.name}
            </h1>
            <div className="flex items-center gap-1">
              <MapPin size={12} color="#aaa" />
              <p className="text-[12px] truncate" style={{ color: '#888', margin: 0 }}>{spot.address}</p>
            </div>
            {distance !== null && (
              <p className="text-[12px] font-semibold mt-1" style={{ color: '#0891b2', margin: 0 }}>
                現在地から {fmtDistance(distance)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {spot.phone && (
              <a href={`tel:${spot.phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl text-[14px] font-bold"
                style={{ background: '#E8F5E9', color: '#16a34a', textDecoration: 'none' }}>
                <Phone size={15} />電話
              </a>
            )}
            <button
              onClick={() => setNavOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl text-[14px] font-bold"
              style={{ background: '#E8F4FD', color: '#0891b2', border: 'none', cursor: 'pointer' }}>
              <Navigation size={15} />経路
            </button>
          </div>
        </div>

        {/* コンテンツ検索バー */}
        <div className="px-4 pb-3 relative">
          {isSearchActive ? (
            /* アクティブ検索チップ */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: '#E8F0FE', flex: 1, minWidth: 0 }}>
                <Gamepad2 size={14} color="#0891b2" />
                <span className="text-[13px] font-semibold truncate" style={{ color: '#0891b2' }}>{activeSearchLabel}</span>
              </div>
              <button onClick={clearSearch} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#888" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="コンテンツ検索..."
                value={contentQuery}
                onChange={e => { setContentQuery(e.target.value); fetchSuggestions(e.target.value); }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                onKeyDown={e => { if (e.key === 'Enter') runSearch(contentQuery); }}
                className="w-full text-[13px]"
                style={{ paddingLeft: 36, paddingRight: contentQuery ? 36 : 12, paddingTop: 8, paddingBottom: 8, borderRadius: 20, border: '1px solid #E8E8E8', background: '#F5F5F5', outline: 'none' }}
              />
              {contentQuery && (
                <button onClick={() => { setContentQuery(''); setSuggestions([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <X size={14} color="#aaa" />
                </button>
              )}
            </div>
          )}

          {showSuggestions && (
            <div className="absolute left-4 right-4 z-10 rounded-xl shadow-lg overflow-hidden" style={{ top: '100%', background: 'white', border: '1px solid #F0F0F0' }}>
              {suggestions.map((s, i) => (
                <button key={i} onMouseDown={() => runSearch(s.label)}
                  className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer' }}>
                  <Gamepad2 size={13} color="#aaa" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-2">
          <span className="text-[12px] font-semibold" style={{ color: '#888' }}>{countLabel}</span>
        </div>
      </div>

      {/* ガチャカードグリッド */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 32px' }}>
        {visibleGachas.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ paddingTop: 60, color: '#BBB' }}>
            <Gamepad2 size={40} color="#DDD" />
            <p className="text-[14px] mt-3">該当するガチャがありません</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 12 }}>
            {visibleGachas.map(g => (
              <SpotGachaCard
                key={g.id}
                gacha={g}
                stockStatus={spot.stockMap[g.id]}
                highlight={searchSet != null && searchSet.has(g.id)}
                mode="grid"
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterDrawer
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={handleFilterApply}
          favoriteIps={[]}
          currentGachaIds={filterGachaIds}
        />
      )}

      {navOpen && (
        <NavPickerModal
          lat={spot.lat}
          lng={spot.lng}
          name={spot.name}
          currentPos={currentPos}
          onClose={() => setNavOpen(false)}
        />
      )}
    </div>
  );
}
