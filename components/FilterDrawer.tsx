'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/layout';
import { PopularIpTagList } from '@/components/PopularIpTagList';

const MOBILE_BREAKPOINT = 768;
const MOBILE_BOTTOM_NAV_HEIGHT = 64;

/** クエリがテキストにマッチするか（カタカナ正規化・エイリアス展開込み） */
function selectedIdsKey(ids: Set<string>): string {
  return [...ids].sort().join(',');
}

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface GachaItem {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
}

interface SelectedIpRow {
  ipName: string;
  selectedCount: number;
  totalCount: number;
  isFav: boolean;
}

interface SearchSuggestion {
  id?: string;
  label: string;
  type: 'genre' | 'gacha';
  imageUrl: string | null;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedGachaIds: string[]) => void;
  favoriteIps: string[];
  currentGachaIds: string[];
}

// フィルターは DB(User.gachaFilterIds) で管理する。初期選択は currentGachaIds（親が DB から取得）で渡される。

// ─── コンポーネント ───────────────────────────────────────────────────────────

export default function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  favoriteIps,
  currentGachaIds,
}: FilterDrawerProps) {
  const [screen, setScreen] = useState<'genres' | 'products'>('genres');
  const [activeIp, setActiveIp] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [popularIps, setPopularIps] = useState<string[]>([]);
  const [activeGacha, setActiveGacha] = useState<GachaItem[]>([]);
  const [activeGachaIp, setActiveGachaIp] = useState<string | null>(null);
  const [searchIps, setSearchIps] = useState<SearchSuggestion[]>([]);
  const [searchGachas, setSearchGachas] = useState<SearchSuggestion[]>([]);
  const [searchResultFor, setSearchResultFor] = useState('');
  const [selectedIpRows, setSelectedIpRows] = useState<SelectedIpRow[]>([]);
  const [loadedSelectionKey, setLoadedSelectionKey] = useState<string | null>(null);

  const [selectedGachaIds, setSelectedGachaIds] = useState<Set<string>>(() => new Set(currentGachaIds));

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

  useEffect(() => {
    fetch('/api/gacha/popular-ips')
      .then((r) => r.json())
      .then((d) => setPopularIps(Array.isArray(d.ipNames) ? d.ipNames : []))
      .catch(() => {});
  }, []);

  const shownPopularIps = popularIps.slice(0, isMobile ? 6 : 12);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setScreen('genres');
      setActiveIp(null);
      setSearchQuery('');
      setSelectedGachaIds(new Set(currentGachaIds));
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectionKey = selectedIdsKey(selectedGachaIds);

  useEffect(() => {
    if (!isOpen || !selectionKey) return;
    const ids = selectionKey.split(',');
    const ac = new AbortController();
    fetch(`/api/gacha/by-ids?ids=${encodeURIComponent(ids.join(','))}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d: { rows?: { ipName: string; selectedCount: number; totalCount: number }[] }) => {
        if (ac.signal.aborted) return;
        const rows = Array.isArray(d.rows) ? d.rows : [];
        setSelectedIpRows(rows.map((row) => ({ ...row, isFav: favoriteIps.includes(row.ipName) })));
        setLoadedSelectionKey(selectionKey);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setSelectedIpRows([]);
        setLoadedSelectionKey(selectionKey);
      });
    return () => ac.abort();
  }, [isOpen, selectionKey, favoriteIps]);

  useEffect(() => {
    if (!activeIp) return;
    const ip = activeIp;
    const ac = new AbortController();
    fetch(`/api/gacha/genre?ipName=${encodeURIComponent(ip)}&limit=1000`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d: { gachas?: GachaItem[] }) => {
        if (ac.signal.aborted) return;
        setActiveGacha(Array.isArray(d.gachas) ? d.gachas : []);
        setActiveGachaIp(ip);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setActiveGacha([]);
        setActiveGachaIp(ip);
      });
    return () => ac.abort();
  }, [activeIp]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const ac = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/gacha/search?suggest=1&q=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((d: { suggestions?: SearchSuggestion[] }) => {
          if (ac.signal.aborted) return;
          const suggestions = Array.isArray(d.suggestions) ? d.suggestions : [];
          setSearchIps(suggestions.filter((s) => s.type === 'genre'));
          setSearchGachas(suggestions.filter((s) => s.type === 'gacha' && s.id));
          setSearchResultFor(q);
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          setSearchIps([]);
          setSearchGachas([]);
          setSearchResultFor(q);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [searchQuery]);

  const trimmedSearch = searchQuery.trim();
  const searchReady = searchResultFor === trimmedSearch;
  const visibleSearchIps = searchReady ? searchIps : [];
  const visibleSearchGachas = searchReady ? searchGachas : [];
  const visibleSearchLoading = trimmedSearch.length > 0 && !searchReady;
  const visibleSelectedRows = selectionKey && loadedSelectionKey === selectionKey ? selectedIpRows : [];
  const visibleSelectionLoading = Boolean(selectionKey) && loadedSelectionKey !== selectionKey;
  const visibleActiveGacha = activeIp !== null && activeGachaIp === activeIp ? activeGacha : [];
  const visibleActiveLoading = activeIp !== null && activeGachaIp !== activeIp;

  const openIp = (ip: string) => { setActiveIp(ip); setScreen('products'); };

  const toggleGacha = (id: string) => {
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedInActive = visibleActiveGacha.filter((g) => selectedGachaIds.has(g.id)).length;

  const selectAll = () =>
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      visibleActiveGacha.forEach((g) => next.add(g.id));
      return next;
    });

  const deselectAll = () =>
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      visibleActiveGacha.forEach((g) => next.delete(g.id));
      return next;
    });

  const handleApply = () => {
    onApply([...selectedGachaIds]);
    onClose();
  };

  if (!isOpen) return null;

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
          </div>

          {/* 検索バーと人気IPタグは同じ枠。下線はタグの下 */}
          <div className="filter-drawer-search px-4 pt-3 pb-3">
            <div className="community-search-input-shell flex items-center gap-2 px-3 py-1.5 lg:py-2.5 rounded-full">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                type="text"
                aria-label="IP・ガチャ名で検索"
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
            {!searchQuery.trim() && shownPopularIps.length > 0 && (
              <div className="pt-3">
                <PopularIpTagList
                  ips={shownPopularIps}
                  onIpClick={(ip) => {
                    setSearchQuery('');
                    openIp(ip);
                  }}
                />
              </div>
            )}
          </div>

          {/* リスト */}
          <div className="flex-1 overflow-y-auto">
            {trimmedSearch ? (
              visibleSearchLoading ? (
                <div className="flex items-center justify-center py-16 text-[14px]" style={{ color: '#aaa' }}>
                  読み込み中...
                </div>
              ) : visibleSearchIps.length === 0 && visibleSearchGachas.length === 0 ? (
                <div className="py-12 text-center text-[13px]" style={{ color: '#aaa' }}>
                  見つかりませんでした
                </div>
              ) : (
                <>
                  {visibleSearchIps.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold" style={{ background: filterSectionBg, color: filterMutedColor, borderBottom: `1px solid ${filterBorderColor}` }}>
                        IP
                      </div>
                      {visibleSearchIps.map((ip) => {
                        const selected = visibleSelectedRows.find((row) => row.ipName === ip.label);
                        return (
                          <button
                            key={ip.label}
                            onClick={() => { setSearchQuery(''); openIp(ip.label); }}
                            className="flex items-center justify-between w-full px-4 py-2 md:py-3.5 transition-colors"
                            style={ipRowBorderStyle}
                            {...ipRowPressHandlers}
                          >
                            <div className="flex items-center gap-2.5 md:gap-3">
                              <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: selected ? '#F2B800' : '#E0E0E0' }} />
                              <div className="flex flex-col items-start">
                                <span className="text-[11px] md:text-[15px] font-semibold" style={{ color: ipNameColor }}>{ip.label}</span>
                                {selected && (
                                  <span className="text-[10px] md:text-[12px]" style={{ color: '#aaa' }}>
                                    {`${selected.selectedCount}/${selected.totalCount}件選択中`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={16} color="#ccc" />
                          </button>
                        );
                      })}
                    </>
                  )}
                  {visibleSearchGachas.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold" style={{ background: filterSectionBg, color: filterMutedColor, borderBottom: `1px solid ${filterBorderColor}` }}>
                        ガチャ（{visibleSearchGachas.length}件）
                      </div>
                      {visibleSearchGachas.map((g) => {
                        const selected = selectedGachaIds.has(g.id!);
                        return (
                          <div
                            key={g.id}
                            className="flex items-center gap-2.5 md:gap-3 px-4 py-2 md:py-3"
                            style={{ borderBottom: `1px solid ${filterBorderColor}` }}
                          >
                            <div className="flex-shrink-0 rounded-lg overflow-hidden w-8 h-8 md:w-10 md:h-10" style={{ background: filterPlaceholderBg }}>
                              {g.imageUrl && (
                                <img
                                  src={g.imageUrl}
                                  alt={g.label}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] md:text-[13px] font-semibold truncate" style={{ color: gachaNameColor(selected) }}>{g.label}</p>
                            </div>
                            <button
                              onClick={() => toggleGacha(g.id!)}
                              className="flex-shrink-0 flex items-center justify-center rounded-full w-6 h-6 md:w-7 md:h-7"
                              style={{
                                background: selected ? '#F2B800' : filterPlaceholderBg,
                                border: selected ? 'none' : '1.5px solid #DDD',
                              }}
                            >
                              {selected && <Check size={12} color="white" strokeWidth={3} />}
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )
            ) : visibleSelectionLoading ? (
              <div className="flex items-center justify-center py-16 text-[14px]" style={{ color: '#aaa' }}>
                読み込み中...
              </div>
            ) : visibleSelectedRows.length === 0 ? (
              <div className="py-12 text-center text-[13px]" style={{ color: '#aaa' }}>
                選択中のIPはありません
              </div>
            ) : (
              <>
                <p className="px-4 pt-3" style={{ fontSize: 11, color: '#AAA', fontWeight: 700, letterSpacing: 1, margin: 0 }}>
                  選択中のIP
                </p>
                {visibleSelectedRows.map((row, index) => (
                  <button
                    key={row.ipName}
                    onClick={() => openIp(row.ipName)}
                    className={`flex items-center justify-between w-full px-4 transition-colors ${index === 0 ? 'pt-2 pb-2.5 md:pb-4' : 'py-2.5 md:py-4'}`}
                    style={ipRowBorderStyle}
                    {...ipRowPressHandlers}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{ width: 8, height: 8, background: '#F2B800' }}
                      />
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] md:text-[15px] font-semibold" style={{ color: ipNameColor }}>
                            {row.ipName}
                          </span>
                          {row.isFav && (
                            <span
                              className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: '#FFF0C0', color: '#B8860B' }}
                            >
                              お気に入り
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] md:text-[12px]" style={{ color: '#aaa' }}>
                          {`${row.selectedCount}/${row.totalCount}件選択中`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="#ccc" />
                  </button>
                ))}
              </>
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
      ) : (
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
                {selectedInActive}/{visibleActiveGacha.length}件選択中
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
            {visibleActiveLoading ? (
              <div className="flex items-center justify-center py-16 text-[14px]" style={{ color: '#aaa' }}>
                読み込み中...
              </div>
            ) : visibleActiveGacha.map((g) => {
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
      )}
    </div>
  );
}
