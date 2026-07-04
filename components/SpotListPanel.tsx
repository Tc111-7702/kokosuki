'use client';

import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, MapPin, ChevronRight } from 'lucide-react';
import type { NearbySpot } from '@/lib/map/markers';

// ─── 型定義 ────────────────────────────────────────────────────────────────────

interface SpotListPanelProps {
  searchSpots: NearbySpot[];
  filterSpots: NearbySpot[];
  hasSearchResult: boolean;
  isFiltered: boolean;
  contentSearchLabel: string | null;
  searchGachaIds: string[];      // コンテンツ検索でヒットしたガチャID群
  filterGachaIds: string[];      // フィルター中のガチャID群
  currentPos: { lat: number; lng: number } | null;
}

// ─── ユーティリティ ────────────────────────────────────────────────────────────

function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

// ─── 店舗行 ───────────────────────────────────────────────────────────────────

function SpotRow({
  spot, matchCount, onClick,
}: {
  spot: NearbySpot;
  matchCount: number | null; // null = 表示しない
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-amber-50"
      style={{ borderBottom: '1px solid #F5F5F5', background: 'white' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold truncate" style={{ color: '#1a1a1a', margin: 0 }}>
          {spot.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin size={10} color="#ccc" />
          <p className="text-[11px] truncate" style={{ color: '#aaa', margin: 0 }}>
            {spot.address}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {matchCount !== null && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#FEF3C7', color: '#B8860B' }}
          >
            {matchCount}件
          </span>
        )}
        <span className="text-[12px] font-semibold" style={{ color: '#0891b2' }}>
          {fmtDistance(spot.distance)}
        </span>
        <ChevronRight size={14} color="#ddd" />
      </div>
    </button>
  );
}

// ─── セクションヘッダー ────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, count, accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div
      className="px-4 py-2.5 flex items-center gap-2 sticky top-0 z-10"
      style={{
        background: accent ? '#FFFBEB' : '#FAFAFA',
        borderBottom: '1px solid #F0F0F0',
        borderTop: '1px solid #F0F0F0',
      }}
    >
      {icon}
      <span className="text-[13px] font-bold flex-1" style={{ color: accent ? '#B8860B' : '#555' }}>
        {title}
      </span>
      <span
        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: accent ? '#FEF3C7' : '#F0F0F0',
          color: accent ? '#B8860B' : '#888',
        }}
      >
        {count}件
      </span>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function SpotListPanel({
  searchSpots, filterSpots, hasSearchResult, isFiltered,
  contentSearchLabel, searchGachaIds, filterGachaIds, currentPos,
}: SpotListPanelProps) {
  const router = useRouter();

  const searchSet = searchGachaIds.length > 0 ? new Set(searchGachaIds) : null;
  const filterSet = filterGachaIds.length > 0 ? new Set(filterGachaIds) : null;

  const navigateToStore = (spot: NearbySpot) => {
    const base = `/store/${spot.id}`;
    const url = contentSearchLabel
      ? `${base}?contentSearch=${encodeURIComponent(contentSearchLabel)}`
      : base;
    router.push(url);
  };

  const showSearch = hasSearchResult && searchSpots.length > 0;
  const showFilter = isFiltered && filterSpots.length > 0;
  const showOther  = !isFiltered && filterSpots.length > 0;
  const isEmpty    = !showSearch && !showFilter && !showOther;

  const searchTitle = contentSearchLabel
    ? `「${contentSearchLabel}」の検索結果`
    : '検索結果';

  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{ background: '#F8F8F8', zIndex: 5 }}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <MapPin size={32} color="#ddd" />
          <p style={{ color: '#aaa', fontSize: 14 }}>近くに店舗が見つかりません</p>
        </div>
      ) : (
        <div className="pb-6">

          {/* 検索セクション */}
          {showSearch && (
            <div>
              <SectionHeader
                icon={<Search size={13} color="#F2B800" />}
                title={searchTitle}
                count={searchSpots.length}
                accent
              />
              {searchSpots.map(spot => {
                const matched = searchSet
                  ? spot.gachaIds.filter(id => searchSet.has(id)).length
                  : null;
                return (
                  <SpotRow
                    key={`search-${spot.id}`}
                    spot={spot}
                    matchCount={matched}
                    onClick={() => navigateToStore(spot)}
                  />
                );
              })}
            </div>
          )}

          {/* フィルターセクション（フィルターON時） */}
          {showFilter && (
            <div>
              <SectionHeader
                icon={<SlidersHorizontal size={13} color="#F2B800" />}
                title="フィルター中の店舗"
                count={filterSpots.length}
                accent
              />
              {filterSpots.map(spot => {
                const matched = filterSet
                  ? spot.gachaIds.filter(id => filterSet.has(id)).length
                  : null;
                return (
                  <SpotRow
                    key={`filter-${spot.id}`}
                    spot={spot}
                    matchCount={matched}
                    onClick={() => navigateToStore(spot)}
                  />
                );

          })}
            </div>
          )}

          {/* 通常セクション（フィルターOFF時） */}
          {showOther && (
            <div>
              <SectionHeader
                icon={<MapPin size={13} color="#aaa" />}
                title="近くの店舗"
                count={filterSpots.length}
              />
              {filterSpots.map(spot => (
                <SpotRow
                  key={`other-${spot.id}`}
                  spot={spot}
                  matchCount={null}
                  onClick={() => navigateToStore(spot)}
                />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
