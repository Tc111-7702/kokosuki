'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { X, ChevronRight, ChevronLeft, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { expandQuery } from '@/lib/gacha-aliases';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { useIsMobile } from '@/lib/useIsMobile';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/desktopPageNav';

const MOBILE_BREAKPOINT = 768;
const MOBILE_BOTTOM_NAV_HEIGHT = 64;

/** クエリがテキストにマッチするか（カタカナ正規化・エイリアス展開込み） */
function matchesQuery(text: string, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return false;
  const textLower = text.toLowerCase();
  return expandQuery(q).some((term) => textLower.includes(term.toLowerCase()));
}

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface GachaItem {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
}

interface IpSummary {
  ipName: string;
  count: number;
  isFav: boolean;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedGachaIds: string[]) => void;
  favoriteIps: string[];
  currentGachaIds: string[];
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mikke_filter_gacha_ids';

// アクティブフィルターが解除されても「最後に選んだガチャ」を覚えておくキー
const SEED_KEY    = 'mikke_filter_gacha_ids_seed';

export function loadStoredGachaIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function loadSeedGachaIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveGachaIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    // 選択したものは seed にも保存（解除後にドロワーで復元するため）
    if (ids.length > 0) localStorage.setItem(SEED_KEY, JSON.stringify(ids));
  } catch {}
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export default function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  favoriteIps,
  currentGachaIds,
}: FilterDrawerProps) {
  const [screen, setScreen] = useState<'genres' | 'products' | 'selected'>('genres');
  const [activeIp, setActiveIp] = useState<string | null>(null);
  const [expandedIps, setExpandedIps] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [ipList, setIpList] = useState<IpSummary[]>([]);
  const [allGacha, setAllGacha] = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedGachaIds, setSelectedGachaIds] = useState<Set<string>>(() => {
    if (currentGachaIds.length > 0) return new Set(currentGachaIds);
    const stored = loadStoredGachaIds();
    if (stored.length > 0) return new Set(stored);
    return new Set(loadSeedGachaIds()); // アクティブフィルター解除後もseedから復元
  });

  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  const mainAreaInsetStyle = {
    top: 0,
    right: 0,
    bottom: isMobile ? MOBILE_BOTTOM_NAV_HEIGHT : 0,
    left: isMobile ? 0 : DESKTOP_PAGE_NAV_WIDTH,
  } as const;
  const filterBorderColor = isDark ? '#262626' : '#F3F4F6';
  const filterScreenBg = isDark ? '#0a0a0a' : '#FFFFFF';
  const filterSectionBg = isDark ? '#0a0a0a' : '#FAFAFA';
  const filterMutedColor = isDark ? '#737373' : '#aaaaaa';
  const filterPlaceholderBg = isDark ? '#1a1a1a' : '#F0F0F0';
  const ipNameColor = isDark ? '#FFFFFF' : '#1a1a1a';
  const gachaSelectedColor = '#F2B800';
  const gachaNameColor = (selected: boolean) => (selected ? gachaSelectedColor : isDark ? '#a3a3a3' : '#555');
  const ipRowPressBg = isDark ? '#1a1a1a' : '#F9FAFB';
  const ipRowBorderStyle = {
    borderBottom: `1px solid ${filterBorderColor}`,
    WebkitTapHighlightColor: 'transparent',
  } as const;
  const filterFooterBorderStyle = { borderTop: `1px solid ${filterBorderColor}` };
  const createRowPressHandlers = (resetBg = '') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = ipRowPressBg;
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
  });
  const ipRowPressHandlers = createRowPressHandlers();
  const selectedGachaRowPressHandlers = createRowPressHandlers(filterScreenBg);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setScreen('genres');
      setActiveIp(null);
      setExpandedIps(new Set());
      setSearchQuery('');
      setLoading(true);
    });
    fetch('/api/gacha/filters')
      .then((r) => r.json())
      .then(({ ipNames, items }: { ipNames: string[]; items: GachaItem[] }) => {
        setAllGacha(items);
        const summary: IpSummary[] = ipNames.map((ip) => ({
          ipName: ip,
          count: items.filter((g) => g.ipName === ip).length,
          isFav: favoriteIps.includes(ip),
        }));
        setIpList(summary);
        const stored = loadStoredGachaIds();
        const seed   = loadSeedGachaIds();
        if (currentGachaIds.length > 0) {
          setSelectedGachaIds(new Set(currentGachaIds));
        } else if (stored.length > 0) {
          setSelectedGachaIds(new Set(stored));
        } else if (seed.length > 0) {
          // アクティブフィルターが解除されていても前回の選択を復元
          setSelectedGachaIds(new Set(seed));
        } else {
          // LIKED_SEED_KEY: マップロード時に profile/me から書き込まれるお気に入りID
          const likedSeed: string[] = (() => {
            try { return JSON.parse(localStorage.getItem('mikke_filter_liked_seed_v1') || '[]') as string[]; } catch { return []; }
          })();
          const validLiked = likedSeed.filter(id => items.some(g => g.id === id));
          if (validLiked.length > 0) {
            setSelectedGachaIds(new Set(validLiked));
          } else {
            const favIds = items.filter((g) => favoriteIps.includes(g.ipName)).map((g) => g.id);
            setSelectedGachaIds(new Set(favIds));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const openIp = (ip: string) => { setActiveIp(ip); setScreen('products'); };

  const toggleGacha = (id: string) => {
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllInIp = (ip: string) => {
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      allGacha.filter((g) => g.ipName === ip).forEach((g) => next.add(g.id));
      return next;
    });
  };

  const deselectAllInIp = (ip: string) => {
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      allGacha.filter((g) => g.ipName === ip).forEach((g) => next.delete(g.id));
      return next;
    });
  };

  const toggleExpand = (ip: string) => {
    setExpandedIps((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip); else next.add(ip);
      return next;
    });
  };

  const activeGacha = allGacha.filter((g) => g.ipName === activeIp);
  const selectedInActive = activeGacha.filter((g) => selectedGachaIds.has(g.id)).length;

  const selectAll = () =>
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      activeGacha.forEach((g) => next.add(g.id));
      return next;
    });

  const deselectAll = () =>
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      activeGacha.forEach((g) => next.delete(g.id));
      return next;
    });

  const handleApply = () => {
    const ids = [...selectedGachaIds];
    saveGachaIds(ids);
    onApply(ids);
    onClose();
  };

  if (!isOpen) return null;

  // 選択中グループ（件数順）
  const selectedGroups = ipList
    .map((ip) => ({
      ipName: ip.ipName,
      items: allGacha.filter((g) => g.ipName === ip.ipName && selectedGachaIds.has(g.id)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="filter-drawer fixed z-[60] flex flex-col" style={{ ...mainAreaInsetStyle, background: filterScreenBg }}>
      {screen === 'genres' ? (
        <>
          {/* ヘッダー */}
          <div className="filter-drawer-header flex items-center gap-3 px-4 py-4">
            <button type="button" onClick={onClose} className="filter-drawer-header-btn p-1">
              <ChevronLeft size={22} />
            </button>
            <span className="filter-drawer-header-title text-[18px] font-black flex-1">
              IP選択
            </span>
            <button
              type="button"
              onClick={() => setScreen('selected')}
              className="map-list-toggle-btn text-[13px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: 'rgba(245, 243, 237, 0.28)', border: '1px solid rgba(237, 233, 216, 0.45)' }}
            >
              選択中のガチャ一覧
            </button>
          </div>

          {/* 検索バー */}
          <div className="filter-drawer-search px-4 py-3">
            <div className="community-search-input-shell flex items-center gap-2 px-3 py-1.5 lg:py-2.5 rounded-full">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="IP・ガチャ名で検索"
                className="community-search-input shell-field flex-1 bg-transparent text-xs lg:text-sm outline-none min-w-0"
                style={{ fontSize: 13, textAlign: 'left' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setSearchQuery(''); }}
                  aria-label="入力をクリア"
                  className="home-search-clear-btn p-0 bg-transparent border-none cursor-pointer leading-none flex-shrink-0"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* リスト */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[14px]" style={{ color: '#aaa' }}>
                読み込み中...
              </div>
            ) : searchQuery.trim() ? (
              // 検索結果
              (() => {
                const q = searchQuery.trim();
                const genreHits = ipList.filter((ip) => matchesQuery(ip.ipName, q));
                const gachaHits = allGacha.filter((g) => matchesQuery(g.seriesName, q) || matchesQuery(g.ipName, q));
                const hasResults = genreHits.length > 0 || gachaHits.length > 0;
                if (!hasResults) return (
                  <div className="py-12 text-center text-[13px]" style={{ color: '#aaa' }}>
                    見つかりませんでした
                  </div>
                );
                return (
                  <>
                    {/* IPセクション */}
                    {genreHits.length > 0 && (
                      <>
                        <div className="px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold" style={{ background: '#FAFAFA', color: '#aaa', borderBottom: '1px solid #F0F0F0' }}>
                          IP
                        </div>
                        {genreHits.map((ip) => {
                          const selectedCount = allGacha.filter((g) => g.ipName === ip.ipName && selectedGachaIds.has(g.id)).length;
                          return (
                            <button
                              key={ip.ipName}
                              onClick={() => { setSearchQuery(''); openIp(ip.ipName); }}
                              className="flex items-center justify-between w-full px-4 py-2 md:py-3.5 transition-colors"
                              style={ipRowBorderStyle}
                              {...ipRowPressHandlers}
                            >
                              <div className="flex items-center gap-2.5 md:gap-3">
                                <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: selectedCount > 0 ? '#F2B800' : '#E0E0E0' }} />
                                <div className="flex flex-col items-start">
                                  <span className="text-[11px] md:text-[15px] font-semibold" style={{ color: ipNameColor }}>{ip.ipName}</span>
                                  <span className="text-[10px] md:text-[12px]" style={{ color: '#aaa' }}>
                                    {selectedCount > 0 ? `${selectedCount}/${ip.count}件選択中` : `${ip.count}件`}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={16} color="#ccc" />
                            </button>
                          );
                        })}
                      </>
                    )}
                    {/* ガチャセクション */}
                    {gachaHits.length > 0 && (
                      <>
                        <div className="px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold" style={{ background: '#FAFAFA', color: '#aaa', borderBottom: '1px solid #F0F0F0' }}>
                          ガチャ（{gachaHits.length}件）
                        </div>
                        {gachaHits.slice(0, 50).map((g) => {
                          const selected = selectedGachaIds.has(g.id);
                          return (
                            <div
                              key={g.id}
                              className="flex items-center gap-2.5 md:gap-3 px-4 py-2 md:py-3"
                              style={{ borderBottom: '1px solid #F5F5F5' }}
                            >
                              <div className="flex-shrink-0 rounded-lg overflow-hidden w-8 h-8 md:w-10 md:h-10" style={{ background: '#F0F0F0' }}>
                                {g.imageUrl && (
                                  <img
                                    src={g.imageUrl}
                                    alt={g.seriesName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] md:text-[13px] font-semibold truncate" style={{ color: gachaNameColor(selected) }}>{g.seriesName}</p>
                                <p className="text-[10px] md:text-[11px]" style={{ color: ipNameColor }}>{g.ipName}</p>
                              </div>
                              <button
                                onClick={() => toggleGacha(g.id)}
                                className="flex-shrink-0 flex items-center justify-center rounded-full w-6 h-6 md:w-7 md:h-7"
                                style={{
                                  background: selected ? '#F2B800' : '#F0F0F0',
                                  border: selected ? 'none' : '1.5px solid #DDD',
                                }}
                              >
                                {selected && <Check size={12} color="white" strokeWidth={3} />}
                              </button>
                            </div>
                          );
                        })}
                        {gachaHits.length > 50 && (
                          <div className="py-3 text-center text-[12px]" style={{ color: '#aaa' }}>
                            他 {gachaHits.length - 50} 件（検索を絞り込んでください）
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()
            ) : (
              ipList.map((ip) => {
                const selectedCount = allGacha
                  .filter((g) => g.ipName === ip.ipName)
                  .filter((g) => selectedGachaIds.has(g.id)).length;
                const selected = selectedCount > 0;
                return (
                  <button
                    key={ip.ipName}
                    onClick={() => openIp(ip.ipName)}
                    className="flex items-center justify-between w-full px-4 py-2.5 md:py-4 transition-colors"
                    style={ipRowBorderStyle}
                    {...ipRowPressHandlers}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{ width: 8, height: 8, background: selected ? '#F2B800' : '#E0E0E0' }}
                      />
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] md:text-[15px] font-semibold" style={{ color: ipNameColor }}>
                            {ip.ipName}
                          </span>
                          {ip.isFav && (
                            <span
                              className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: '#FFF0C0', color: '#B8860B' }}
                            >
                              お気に入り
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] md:text-[12px]" style={{ color: '#aaa' }}>
                          {selectedCount > 0 ? `${selectedCount}/${ip.count}件選択中` : `${ip.count}件`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="#ccc" />
                  </button>
                );
              })
            )}
          </div>

          {/* フッター */}
          <div className="px-4 pb-8 pt-3" style={filterFooterBorderStyle}>
            <button
              onClick={handleApply}
              className="w-full py-2 md:py-3.5 rounded-2xl text-[15px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}
            >
              適用する（{selectedGachaIds.size}件選択中）
            </button>
          </div>
        </>
      ) : screen === 'products' ? (
        <>
          {/* ヘッダー */}
          <div className="filter-drawer-header flex items-center gap-3 px-4 py-4">
            <button type="button" onClick={() => setScreen('genres')} className="filter-drawer-header-btn p-1">
              <ChevronLeft size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="filter-drawer-header-title text-[18px] font-black truncate">
                {activeIp}
              </div>
              <div className="filter-drawer-header-subtitle text-[12px]">
                {selectedInActive}/{activeGacha.length}件選択中
              </div>
            </div>
            <button type="button" onClick={onClose} className="filter-drawer-header-btn p-1">
              <X size={22} />
            </button>
          </div>

          {/* 全選択/全解除 */}
          <div className="flex gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${filterBorderColor}` }}>
            <button
              onClick={selectAll}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}
            >
              全選択
            </button>
            <button
              onClick={deselectAll}
              className="map-list-toggle-btn flex-1 py-2 rounded-xl text-[13px] font-bold active:scale-95 transition-transform"
              style={{ background: 'rgba(245, 243, 237, 0.28)', border: '1px solid rgba(237, 233, 216, 0.45)' }}
            >
              全解除
            </button>
          </div>

          {/* 商品リスト */}
          <div className="flex-1 overflow-y-auto">
            {activeGacha.map((g) => {
              const selected = selectedGachaIds.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGacha(g.id)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 md:py-3.5 transition-colors"
                  style={{ borderBottom: `1px solid ${filterBorderColor}`, WebkitTapHighlightColor: 'transparent' }}
                  {...ipRowPressHandlers}
                >
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      width: 22, height: 22,
                      background: selected ? '#F2B800' : '#F0F0F0',
                      border: selected ? 'none' : '1.5px solid #DDD',
                    }}
                  >
                    {selected && <Check size={13} color="white" strokeWidth={3} />}
                  </div>
                  <div
                    className="flex-shrink-0 rounded-lg overflow-hidden w-10 h-10 md:w-11 md:h-11"
                    style={{ background: '#F0F0F0' }}
                  >
                    {g.imageUrl && (
                      <img
                        src={g.imageUrl}
                        alt={g.seriesName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[11px] md:text-[14px] text-left flex-1 leading-snug"
                    style={{ color: gachaNameColor(selected), fontWeight: selected ? 600 : 400 }}
                  >
                    {g.seriesName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* フッター */}
          <div className="px-4 pb-8 pt-3" style={filterFooterBorderStyle}>
            <button
              onClick={handleApply}
              className="w-full py-2 md:py-3.5 rounded-2xl text-[15px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}
            >
              適用する（{selectedGachaIds.size}件選択中）
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ヘッダー */}
          <div className="filter-drawer-header flex items-center gap-3 px-4 py-4" style={{ background: filterScreenBg }}>
            <button type="button" onClick={() => setScreen('genres')} className="filter-drawer-header-btn p-1"><ChevronLeft size={22} /></button>
            <div className="flex-1 min-w-0">
              <div className="filter-drawer-header-title text-[16px] md:text-[18px] font-black">選択中のガチャ</div>
              <div className="filter-drawer-header-subtitle text-[11px] md:text-[12px]">{selectedGachaIds.size}件</div>
            </div>
            <button type="button" onClick={onClose} className="filter-drawer-header-btn p-1"><X size={22} /></button>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ background: filterScreenBg }}>
            {selectedGroups.length === 0 ? (
              <div className="py-16 text-center text-[11px] md:text-[13px]" style={{ color: filterMutedColor }}>選択中のガチャがありません</div>
            ) : (
              selectedGroups.map((group) => {
                const expanded = expandedIps.has(group.ipName);
                return (
                  <div key={group.ipName}>
                    <div className="flex items-center px-4 py-1.5 md:py-2.5" style={{ background: filterSectionBg, borderBottom: `1px solid ${filterBorderColor}` }}>
                      <button onClick={() => toggleExpand(group.ipName)} className="flex items-center gap-2 flex-1 min-w-0">
                        {expanded ? <ChevronUp size={15} color={filterMutedColor} /> : <ChevronDown size={15} color={filterMutedColor} />}
                        <span className="text-[11px] md:text-[13px] font-bold truncate" style={{ color: ipNameColor }}>{group.ipName}</span>
                        <span className="text-[10px] md:text-[11px] flex-shrink-0" style={{ color: filterMutedColor }}>{group.items.length}件</span>
                      </button>
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        <button onClick={() => selectAllInIp(group.ipName)} className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#F2B800', color: 'white' }}>全選択</button>
                        <button
                          onClick={() => deselectAllInIp(group.ipName)}
                          className="map-list-toggle-btn text-[10px] font-bold px-2 py-1 rounded-full active:scale-95 transition-transform"
                          style={{ background: 'rgba(245, 243, 237, 0.28)', border: '1px solid rgba(237, 233, 216, 0.45)' }}
                        >
                          全解除
                        </button>
                      </div>
                    </div>
                    {expanded && group.items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => toggleGacha(g.id)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 md:py-3 transition-colors"
                        style={{ background: filterScreenBg, borderBottom: `1px solid ${filterBorderColor}`, WebkitTapHighlightColor: 'transparent' }}
                        {...selectedGachaRowPressHandlers}
                      >
                        <div className="flex-shrink-0 rounded-lg overflow-hidden w-8 h-8 md:w-10 md:h-10" style={{ background: filterPlaceholderBg }}>
                          {g.imageUrl && <img src={g.imageUrl} alt={g.seriesName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                        </div>
                        <span className="text-[10px] md:text-[13px] text-left flex-1 leading-snug" style={{ color: gachaSelectedColor }}>{g.seriesName}</span>
                        <X size={14} color={filterMutedColor} className="flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 pb-8 pt-3" style={{ ...filterFooterBorderStyle, background: filterScreenBg }}>
            <button onClick={handleApply} className="w-full py-2 md:py-3.5 rounded-2xl text-[13px] md:text-[15px] font-bold" style={{ background: '#F2B800', color: 'white' }}>
              {`適用する（${selectedGachaIds.size}件選択中）`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
