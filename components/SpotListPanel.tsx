'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, MapPin, ChevronRight } from 'lucide-react';
import type { NearbySpot } from '@/lib/map/markers';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

// ─── 型定義 ────────────────────────────────────────────────────────────────────

interface SpotListPanelProps {
  searchSpots: NearbySpot[];
  filterSpots: NearbySpot[];
  hasSearchResult: boolean;
  isFiltered: boolean;
  contentSearchLabel: string | null;
  searchGachaIds: string[];
  filterGachaIds: string[];
}

interface ListTheme {
  panelBg: string;
  sectionBg: string;
  sectionAccentBg: string;
  sectionBorderColor: string;
  rowBorderColor: string;
  rowBg: string;
  filterRowGlow: string | undefined;
  rowPressBg: string;
  nameColor: string;
  mutedColor: string;
  chevronColor: string;
  mapPinColor: string;
  sectionTitleColor: string;
  sectionAccentTitleColor: string;
  badgeBg: string;
  badgeColor: string;
  accentBadgeBg: string;
  accentBadgeColor: string;
  emptyColor: string;
}

function useListTheme(): ListTheme {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  return {
    panelBg: isDark ? '#0a0a0a' : '#F8F8F8',
    sectionBg: isDark ? '#0a0a0a' : '#FAFAFA',
    sectionAccentBg: isDark ? '#141108' : '#FFFBEB',
    sectionBorderColor: isDark ? '#262626' : '#F0F0F0',
    rowBorderColor: isDark ? '#262626' : '#F5F5F5',
    rowBg: isDark ? '#0a0a0a' : '#FFFFFF',
    filterRowGlow: isDark
      ? 'inset 0 0 0 1px rgba(242, 184, 0, 0.22), 0 0 18px rgba(242, 184, 0, 0.14)'
      : undefined,
    rowPressBg: isDark ? '#1a1a1a' : '#F9FAFB',
    nameColor: isDark ? '#FFFFFF' : '#1a1a1a',
    mutedColor: isDark ? '#737373' : '#aaaaaa',
    chevronColor: isDark ? '#525252' : '#dddddd',
    mapPinColor: isDark ? '#525252' : '#cccccc',
    sectionTitleColor: isDark ? '#a3a3a3' : '#555555',
    sectionAccentTitleColor: isDark ? '#e6b422' : '#B8860B',
    badgeBg: isDark ? '#262626' : '#F0F0F0',
    badgeColor: isDark ? '#a3a3a3' : '#888888',
    accentBadgeBg: isDark ? '#3d3210' : '#FEF3C7',
    accentBadgeColor: isDark ? '#F2B800' : '#B8860B',
    emptyColor: isDark ? '#737373' : '#aaaaaa',
  };
}

// ─── ユーティリティ ────────────────────────────────────────────────────────────

function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function createRowPressHandlers(resetBg: string, pressBg: string) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = pressBg;
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = resetBg;
    },
    onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = resetBg;
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = resetBg;
    },
  };
}

// ─── 店舗行 ───────────────────────────────────────────────────────────────────

function SpotRow({
  spot, matchCount, onClick, theme,
}: {
  spot: NearbySpot;
  matchCount: number | null;
  onClick: () => void;
  theme: ListTheme;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3 transition-colors"
      style={{
        borderBottom: `1px solid ${theme.rowBorderColor}`,
        background: theme.rowBg,
        WebkitTapHighlightColor: 'transparent',
      }}
      {...createRowPressHandlers(theme.rowBg, theme.rowPressBg)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] md:text-[14px] font-bold truncate" style={{ color: theme.nameColor, margin: 0 }}>
          {spot.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin color={theme.mapPinColor} className="w-[9px] h-[9px] md:w-[10px] md:h-[10px] flex-shrink-0" />
          <p className="text-[10px] md:text-[11px] truncate" style={{ color: theme.mutedColor, margin: 0 }}>
            {spot.address}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        {matchCount !== null && (
          <span
            className="text-[10px] md:text-[11px] font-bold px-1.5 md:px-2 py-0 rounded-full"
            style={{
              background: theme.accentBadgeBg,
              color: theme.accentBadgeColor,
            }}
          >
            {matchCount}件
          </span>
        )}
        <span className="text-[11px] md:text-[12px] font-semibold" style={{ color: '#0891b2' }}>
          {fmtDistance(spot.distance)}
        </span>
        <ChevronRight color={theme.chevronColor} className="w-3 h-3 md:w-[14px] md:h-[14px]" />
      </div>
    </button>
  );
}

// ─── セクションヘッダー ────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, count, accent = false, glow = false, theme,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent?: boolean;
  glow?: boolean;
  theme: ListTheme;
}) {
  return (
    <div
      className="px-4 py-2 md:py-2.5 flex items-center gap-2 sticky top-0 z-10"
      style={{
        background: accent ? theme.sectionAccentBg : theme.sectionBg,
        borderBottom: `1px solid ${theme.sectionBorderColor}`,
        borderTop: `1px solid ${theme.sectionBorderColor}`,
        boxShadow: glow ? theme.filterRowGlow : undefined,
      }}
    >
      {icon}
      <span
        className="text-[11px] md:text-[13px] font-bold flex-1"
        style={{ color: accent ? theme.sectionAccentTitleColor : theme.sectionTitleColor }}
      >
        {title}
      </span>
      <span
        className="text-[10px] md:text-[11px] font-bold px-1.5 md:px-2 py-0 rounded-full"
        style={{
          background: accent ? theme.accentBadgeBg : theme.badgeBg,
          color: accent ? theme.accentBadgeColor : theme.badgeColor,
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
  contentSearchLabel, searchGachaIds, filterGachaIds,
}: SpotListPanelProps) {
  const router = useRouter();
  const theme = useListTheme();

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
      style={{ background: theme.panelBg, zIndex: 5 }}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center h-full">
          <p style={{ color: theme.emptyColor, fontSize: 14 }}>近くに店舗が見つかりません</p>
        </div>
      ) : (
        <div className="pb-6">

          {showSearch && (
            <div>
              <SectionHeader
                icon={<Search size={13} color="#F2B800" />}
                title={searchTitle}
                count={searchSpots.length}
                accent
                theme={theme}
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
                    theme={theme}
                  />
                );
              })}
            </div>
          )}

          {showFilter && (
            <div>
              <SectionHeader
                icon={<SlidersHorizontal size={13} color="#F2B800" />}
                title="フィルター中の店舗"
                count={filterSpots.length}
                accent
                glow
                theme={theme}
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
                    theme={theme}
                  />
                );
              })}
            </div>
          )}

          {showOther && (
            <div>
              <SectionHeader
                icon={<MapPin size={13} color={theme.mapPinColor} />}
                title="近くの店舗"
                count={filterSpots.length}
                theme={theme}
              />
              {filterSpots.map(spot => (
                <SpotRow
                  key={`other-${spot.id}`}
                  spot={spot}
                  matchCount={null}
                  onClick={() => navigateToStore(spot)}
                  theme={theme}
                />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
