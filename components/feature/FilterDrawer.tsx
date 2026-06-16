'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

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
  // 'genres' = ジャンル一覧, 'products' = 商品一覧（特定ジャンル）
  const [screen, setScreen] = useState<'genres' | 'products'>('genres');
  const [activeIp, setActiveIp] = useState<string | null>(null);

  const [ipList, setIpList] = useState<IpSummary[]>([]);
  const [allGacha, setAllGacha] = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 選択中のgachaIds（ジャンルをまたいで保持）
  const [selectedGachaIds, setSelectedGachaIds] = useState<Set<string>>(new Set());

  // フィルターデータ取得 & 初期選択
  useEffect(() => {
    if (!isOpen) return;
    setScreen('genres');
    setActiveIp(null);
    setLoading(true);
    fetch('/api/gacha/filters')
      .then((r) => r.json())
      .then(({ ipNames, items }: { ipNames: string[]; items: GachaItem[] }) => {
        setAllGacha(items);

        // 件数でソート（降順）、お気に入りフラグ付き
        const summary: IpSummary[] = ipNames.map((ip) => ({
          ipName: ip,
          count: items.filter((g) => g.ipName === ip).length,
          isFav: favoriteIps.includes(ip),
        }));
        summary.sort((a, b) => b.count - a.count);
        setIpList(summary);

        // 初期選択: 現在適用中 or お気に入りの全商品
        if (currentGachaIds.length > 0) {
          setSelectedGachaIds(new Set(currentGachaIds));
        } else {
          const favIds = items
            .filter((g) => favoriteIps.includes(g.ipName))
            .map((g) => g.id);
          setSelectedGachaIds(new Set(favIds));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ジャンルをタップ → 商品一覧へ
  const openIp = (ip: string) => {
    setActiveIp(ip);
    setScreen('products');
  };

  const toggleGacha = (id: string) => {
    setSelectedGachaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'white' }}
    >
      {screen === 'genres' ? (
        // ─── ジャンル一覧画面 ───────────────────────────────────────────────
        <>
          {/* ヘッダー */}
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: '1px solid #F0F0F0' }}
          >
            <span className="text-[18px] font-black" style={{ color: '#1a1a1a' }}>
              ジャンル選択
            </span>
            <button onClick={onClose} className="p-1">
              <X size={22} color="#555" />
            </button>
          </div>

          {/* リスト */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[14px]" style={{ color: '#aaa' }}>
                読み込み中...
              </div>
            ) : (
              ipList.map((ip) => {
                const selected = allGacha
                  .filter((g) => g.ipName === ip.ipName)
                  .some((g) => selectedGachaIds.has(g.id));
                const selectedCount = allGacha
                  .filter((g) => g.ipName === ip.ipName)
                  .filter((g) => selectedGachaIds.has(g.id)).length;

                return (
                  <button
                    key={ip.ipName}
                    onClick={() => openIp(ip.ipName)}
                    className="flex items-center justify-between w-full px-4 py-4 active:bg-gray-50 transition-colors"
                    style={{ borderBottom: '1px solid #F5F5F5' }}
                  >
                    <div className="flex items-center gap-3">
                      {/* 選択状態インジケーター */}
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: 8, height: 8,
                          background: selected ? '#F2B800' : '#E0E0E0',
                        }}
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
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold active:scale-98 transition-transform"
              style={{ background: '#F2B800', color: 'white' }}
            >
              適用する（{selectedGachaIds.size}件選択中）
            </button>
          </div>
        </>
      ) : (
        // ─── 商品一覧画面 ────────────────────────────────────────────────────
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
                  {/* 商品アイコン */}
                  <div
                    className="flex-shrink-0 rounded-lg overflow-hidden"
                    style={{
                      width: 44, height: 44,
                      background: '#F0F0F0',
                    }}
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
              className="w-full py-3.5 rounded-2xl text-[15px] font-bold active:scale-98 transition-transform"
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
