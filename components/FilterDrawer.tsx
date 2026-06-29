'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, ChevronDown, ChevronUp, Search } from 'lucide-react';

// ─── 検索エイリアス（日本語表記 → 正式タイトル） ─────────────────────────────
const SEARCH_ALIASES: Record<string, string[]> = {
  'ONE PIECE':      ['ワンピース', 'onepiece', 'one piece'],
  'HUNTER×HUNTER': ['ハンターハンター', 'hunterhunter', 'hunter hunter'],
  'SPY×FAMILY':    ['スパイファミリー', 'spyfamily', 'spy family'],
  'ポケモン':        ['pokemon', 'pokémon'],
  'ドラゴンボール':   ['dragonball', 'dragon ball', 'db', 'dbz'],
  '呪術廻戦':        ['jjk', 'jujutsu'],
  'チェンソーマン':   ['chainsaw man', 'chainsawman'],
  'ハイキュー!!':    ['haikyuu', 'haikyu'],
  'DEATH NOTE':      ['デスノート', 'デスノ', 'death note', 'deathnote'],
};

/** クエリがテキストにマッチするか（エイリアス含む） */
function matchesQuery(text: string, q: string): boolean {
  if (text.toLowerCase().includes(q)) return true;
  // エイリアス: text が正式名称のとき、qがエイリアスに含まれるか
  const aliases = SEARCH_ALIASES[text] ?? [];
  if (aliases.some((a) => a.includes(q))) return true;
  // 逆引き: text がエイリアスのとき
  for (const [canonical, alts] of Object.entries(SEARCH_ALIASES)) {
    if (text.toLowerCase().includes(canonical.toLowerCase())) {
      if (alts.some((a) => a.includes(q))) return true;
    }
  }
  return false;
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

export function loadStoredGachaIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveGachaIds(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
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

  const [selectedGachaIds, setSelectedGachaIds] = useState<Set<string>>(() =>
    new Set(currentGachaIds.length > 0 ? currentGachaIds : loadStoredGachaIds())
  );

  useEffect(() => {
    if (!isOpen) return;
    setScreen('genres');
    setActiveIp(null);
    setExpandedIps(new Set());
    setSearchQuery('');
    setLoading(true);
    fetch('/api/gacha/filters')
      .then((r) => r.json())
      .then(({ ipNames, items }: { ipNames: string[]; items: GachaItem[] }) => {
        setAllGacha(items);
        const summary: IpSummary[] = ipNames.map((ip) => ({
          ipName: ip,
          count: items.filter((g) => g.ipName === ip).length,
          isFav: favoriteIps.includes(ip),
        }));
        summary.sort((a, b) => b.count - a.count);
        setIpList(summary);
        const stored = loadStoredGachaIds();
        if (currentGachaIds.length > 0) {
          setSelectedGachaIds(new Set(currentGachaIds));
        } else if (stored.length > 0) {
          setSelectedGachaIds(new Set(stored));
        } else {
          const favIds = items.filter((g) => favoriteIps.includes(g.ipName)).map((g) => g.id);
          setSelectedGachaIds(new Set(favIds));
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'white' }}>
      {screen === 'genres' ? (
        <>
          {/* ヘッダー */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: '1px solid #F0F0F0' }}
          >
            <button onClick={onClose} className="p-1">
              <ChevronLeft size={22} color="#555" />
            </button>
            <span className="text-[18px] font-black flex-1" style={{ color: '#1a1a1a' }}>
              ジャンル選択
            </span>
            <button
              onClick={() => setScreen('selected')}
              className="text-[13px] font-bold px-3.5 py-2 rounded-full"
              style={{ background: '#F5F3ED', color: '#555' }}
            >
              選択中のガチャ一覧
            </button>
          </div>

          {/* 検索バー */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F5F5F5' }}
            >
              <Search size={15} color="#aaa" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ジャンル・ガチャ名で検索"
                className="flex-1 bg-transparent text-[14px] outline-none"
                style={{ color: '#1a1a1a' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X size={14} color="#aaa" />
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
                const q = searchQuery.trim().toLowerCase();
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
                    {/* ジャンルセクション */}
                    {genreHits.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-[11px] font-bold" style={{ background: '#FAFAFA', color: '#aaa', borderBottom: '1px solid #F0F0F0' }}>
                          ジャンル
                        </div>
                        {genreHits.map((ip) => {
                          const selectedCount = allGacha.filter((g) => g.ipName === ip.ipName && selectedGachaIds.has(g.id)).length;
                          return (
                            <button
                              key={ip.ipName}
                              onClick={() => { setSearchQuery(''); openIp(ip.ipName); }}
                              className="flex items-center justify-between w-full px-4 py-3.5 active:bg-gray-50"
                              style={{ borderBottom: '1px solid #F5F5F5' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: selectedCount > 0 ? '#F2B800' : '#E0E0E0' }} />
                                <div className="flex flex-col items-start">
                                  <span className="text-[15px] font-semibold" style={{ color: '#1a1a1a' }}>{ip.ipName}</span>
                                  <span className="text-[12px]" style={{ color: '#aaa' }}>
                                    {selectedCount > 0 ? `${selectedCount}/${ip.count}件選択中` : `${ip.count}件`}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={18} color="#ccc" />
                            </button>
                          );
                        })}
                      </>
                    )}
                    {/* 商品セクション */}
                    {gachaHits.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-[11px] font-bold" style={{ background: '#FAFAFA', color: '#aaa', borderBottom: '1px solid #F0F0F0' }}>
                          商品（{gachaHits.length}件）
                        </div>
                        {gachaHits.slice(0, 50).map((g) => {
                          const selected = selectedGachaIds.has(g.id);
                          return (
                            <div
                              key={g.id}
                              className="flex items-center gap-3 px-4 py-3"
                              style={{ borderBottom: '1px solid #F5F5F5' }}
                            >
                              {/* 商品画像 */}
                              <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 40, height: 40, background: '#F0F0F0' }}>
                                {g.imageUrl && (
                                  <img
                                    src={g.imageUrl}
                                    alt={g.seriesName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              {/* 商品名・ジャンル */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold truncate" style={{ color: '#1a1a1a' }}>{g.seriesName}</p>
                                <p className="text-[11px]" style={{ color: '#aaa' }}>{g.ipName}</p>
                              </div>
                              {/* 選択ボタン */}
                              <button
                                onClick={() => toggleGacha(g.id)}
                                className="flex-shrink-0 flex items-center justify-center rounded-full"
                                style={{
                                  width: 28, height: 28,
                                  background: selected ? '#F2B800' : '#F0F0F0',
                                  border: selected ? 'none' : '1.5px solid #DDD',
                                }}
                              >
                                {selected && <Check size={14} color="white" strokeWidth={3} />}
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
                    className="flex items-center justify-between w-full px-4 py-4 active:bg-gray-50 transition-colors"
                    style={{ borderBottom: '1px solid #F5F5F5' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{ width: 8, height: 8, background: selected ? '#F2B800' : '#E0E0E0' }}
                      />
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold" style={{ color: '#1a1a1a' }}>
                            {ip.ipName}
                          </span>
                          {ip.isFav && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: '#FFF0C0', color: '#B8860B' }}
                            >
                              お気に入り
                            </span>
                          )}
                        </div>
                        <span className="text-[12px]" style={{ color: '#aaa' }}>
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
          <div className="px-4 pb-8 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
            <button
              onClick={handleApply}
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}
            >
              適用する（{selectedGachaIds.size}件選択中）
            </button>
          </div>
        </>
      ) : screen === 'products' ? (
        <>
          {/* ヘッダー */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: '1px solid #F0F0F0' }}
          >
            <button onClick={() => setScreen('genres')} className="p-1">
              <ChevronLeft size={22} color="#555" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-black truncate" style={{ color: '#1a1a1a' }}>
                {activeIp}
              </div>
              <div className="text-[12px]" style={{ color: '#aaa' }}>
                {selectedInActive}/{activeGacha.length}件選択中
              </div>
            </div>
            <button onClick={onClose} className="p-1">
              <X size={22} color="#555" />
            </button>
          </div>

          {/* 全選択/全解除 */}
          <div className="flex gap-2 px-4 py-2" style={{ borderBottom: '1px solid #F5F5F5' }}>
            <button
              onClick={selectAll}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}
            >
              全選択
            </button>
            <button
              onClick={deselectAll}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: '#F5F3ED', color: '#555' }}
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
                  className="flex items-center gap-3 w-full px-4 py-3.5 active:bg-gray-50 transition-colors"
                  style={{ borderBottom: '1px solid #F5F5F5' }}
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
                    className="flex-shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 44, height: 44, background: '#F0F0F0' }}
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
                    className="text-[14px] text-left flex-1"
                    style={{ color: selected ? '#1a1a1a' : '#555', fontWeight: selected ? 600 : 400 }}
                  >
                    {g.seriesName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* フッター */}
          <div className="px-4 pb-8 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
            <button
              onClick={handleApply}
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}
            >
              適用する（{selectedGachaIds.size}件選択中）
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ヘッダー */}
          <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <button onClick={() => setScreen('genres')} className="p-1"><ChevronLeft size={22} color="#555" /></button>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-black" style={{ color: '#1a1a1a' }}>選択中のガチャ</div>
              <div className="text-[12px]" style={{ color: '#aaa' }}>{selectedGachaIds.size}件</div>
            </div>
            <button onClick={onClose} className="p-1"><X size={22} color="#555" /></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedGroups.length === 0 ? (
              <div className="py-16 text-center text-[13px]" style={{ color: '#aaa' }}>選択中の商品がありません</div>
            ) : (
              selectedGroups.map((group) => {
                const expanded = expandedIps.has(group.ipName);
                return (
                  <div key={group.ipName}>
                    <div className="flex items-center px-4 py-2.5" style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                      <button onClick={() => toggleExpand(group.ipName)} className="flex items-center gap-2 flex-1 min-w-0">
                        {expanded ? <ChevronUp size={15} color="#aaa" /> : <ChevronDown size={15} color="#aaa" />}
                        <span className="text-[13px] font-bold truncate" style={{ color: '#555' }}>{group.ipName}</span>
                        <span className="text-[11px] flex-shrink-0" style={{ color: '#aaa' }}>{group.items.length}件</span>
                      </button>
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        <button onClick={() => selectAllInIp(group.ipName)} className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#F2B800', color: 'white' }}>全選択</button>
                        <button onClick={() => deselectAllInIp(group.ipName)} className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#F0F0F0', color: '#555' }}>全解除</button>
                      </div>
                    </div>
                    {expanded && group.items.map((g) => (
                      <button key={g.id} onClick={() => toggleGacha(g.id)} className="flex items-center gap-3 w-full px-4 py-3 active:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F5F5F5' }}>
                        <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 40, height: 40, background: '#F0F0F0' }}>
                          {g.imageUrl && <img src={g.imageUrl} alt={g.seriesName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                        </div>
                        <span className="text-[13px] text-left flex-1" style={{ color: '#1a1a1a' }}>{g.seriesName}</span>
                        <X size={15} color="#ccc" />
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 pb-8 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
            <button onClick={handleApply} className="w-full py-3.5 rounded-2xl text-[15px] font-bold" style={{ background: '#F2B800', color: 'white' }}>
              適用する（{selectedGachaIds.size}件選択中）
            </button>
          </div>
        </>
      )}
    </div>
  );
}
