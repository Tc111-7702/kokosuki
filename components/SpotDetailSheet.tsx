'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Navigation, Phone, ChevronRight } from 'lucide-react';
import { SpotGachaCard } from '@/components/SpotGachaCard';
import NavPickerModal from '@/components/NavPickerModal';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export interface SpotDetail {
  lat: number;
  lng: number;
  id: string;
  name: string;
  address: string;
  distance: number;
  phone?: string | null;
  googleMapsUrl: string | null;
  gachaIds: string[];
  stockMap: Record<string, string>;
}

export interface GachaInfo {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
}

interface SpotDetailSheetProps {
  spot: SpotDetail | null;
  gachaMap: Map<string, GachaInfo>;
  filterGachaIds: string[];
  searchOverrideIds?: string[] | null; // セット時はこれだけ表示
  searchLabel?: string | null;         // 検索ラベル（店舗ページへの引き継ぎ用）
  highlightGachaId?: string;           // 先頭に固定するガチャID
  currentPos?: { lat: number; lng: number } | null;
  onClose: () => void;
  onClearFilter?: () => void;
  onOpenFilter?: () => void;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── ユーティリティ ────────────────────────────────────────────────────────────

function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}


// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function SpotDetailSheet({ spot, gachaMap, filterGachaIds, searchOverrideIds, searchLabel, highlightGachaId, currentPos, onClose, onClearFilter, onOpenFilter }: SpotDetailSheetProps) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 店舗が切り替わったら折りたたみ状態にリセット
  useEffect(() => { setExpanded(false); }, [spot?.id]);

  if (!spot) return null;

  // searchOverrideIds がある場合: 検索ヒット → フィルター → その他 の順で表示
  // searchOverrideIds がない場合: フィルター通過分のみ表示
  const searchSet = searchOverrideIds ? new Set(searchOverrideIds) : null;
  const allMatchedGacha = spot.gachaIds
    .filter(id => {
      if (searchSet != null) {
        // 検索ヒット OR フィルター中のもの（フィルター未設定なら全件）
        return searchSet.has(id) || filterGachaIds.length === 0 || filterGachaIds.includes(id);
      }
      return filterGachaIds.length === 0 || filterGachaIds.includes(id);
    })
    .map(id => gachaMap.get(id))
    .filter((g): g is GachaInfo => g !== undefined)
    .sort((a, b) => {
      // 検索ヒット > highlightGachaId > フィルター > その他
      if (searchSet != null) {
        const aS = searchSet.has(a.id), bS = searchSet.has(b.id);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
      }
      if (highlightGachaId) {
        if (a.id === highlightGachaId) return -1;
        if (b.id === highlightGachaId) return 1;
      }
      return 0;
    });
  const matchedGacha = allMatchedGacha.slice(0, 10);

  const knownCount = matchedGacha.filter(g => spot.stockMap[g.id]).length;
  const isSearchMode = searchOverrideIds != null;
  const isEmpty = matchedGacha.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose} />
      <div ref={sheetRef} className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          background: 'white', borderRadius: '20px 20px 0 0',
          maxHeight: expanded ? '90vh' : '46vh',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>

        {/* ドラッグハンドル: 下にドラッグで折りたたみ、タップでトグル */}
        <div
          className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-pointer select-none"
          onWheel={e => {
            if (e.deltaY < 0 && expanded) setExpanded(false);
            if (e.deltaY > 0 && !expanded) setExpanded(true);
          }}
          onPointerDown={e => {
            dragStartY.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (dragStartY.current === null) return;
            const dy = e.clientY - dragStartY.current;
            if (dy > 40 && expanded) { setExpanded(false); dragStartY.current = null; }
            if (dy < -40 && !expanded) { setExpanded(true); dragStartY.current = null; }
          }}
          onPointerUp={e => {
            if (dragStartY.current !== null) {
              const dy = e.clientY - dragStartY.current;
              if (Math.abs(dy) < 8) setExpanded(v => !v);
              dragStartY.current = null;
            }
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: expanded ? '#C8C8C8' : '#F2B800' }} />
        </div>

        {/* 店舗名・住所ヘッダー（固定） */}
        <div
          className="flex items-start justify-between px-4 pt-2 pb-3 flex-shrink-0"
          style={{ cursor: expanded ? 'default' : 'pointer' }}
          onWheel={e => {
            if (e.deltaY < 0 && expanded) setExpanded(false);
            if (e.deltaY > 0 && !expanded) setExpanded(true);
          }}
          onPointerDown={e => {
            if ((e.target as HTMLElement).closest('button')) return; // ボタンへのクリックは除外
            dragStartY.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (dragStartY.current === null) return;
            const dy = e.clientY - dragStartY.current;
            if (dy > 40 && expanded) { setExpanded(false); dragStartY.current = null; }
            if (dy < -40 && !expanded) { setExpanded(true); dragStartY.current = null; }
          }}
          onPointerUp={e => { dragStartY.current = null; }}
        >
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-[18px] font-black leading-tight" style={{ color: '#1a1a1a' }}>{spot.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={12} color="#aaa" />
              <p className="text-[12px] truncate" style={{ color: '#888' }}>{spot.address}</p>
            </div>
            <p className="text-[12px] font-semibold mt-1" style={{ color: '#0891b2' }}>
              現在地から {fmtDistance(currentPos ? haversineM(currentPos.lat, currentPos.lng, spot.lat, spot.lng) : spot.distance)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 flex-shrink-0">
            <X size={22} color="#555" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          style={{ minHeight: 0 }}
          onScroll={e => {
            const top = (e.currentTarget as HTMLDivElement).scrollTop;
            if (top > 0 && !expanded) setExpanded(true);
          }}
          onWheel={e => {
            const el = e.currentTarget as HTMLDivElement;
            if (el.scrollTop === 0 && e.deltaY < 0 && expanded) {
              setExpanded(false);
            }
          }}
        >
          <div className="px-4 py-2 text-[13px] font-bold flex items-center justify-between"
            style={{ color: '#888', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
            <span>{isSearchMode ? '検索結果' : '取扱商品'} {isEmpty ? 0 : matchedGacha.length}件</span>
            <div className="flex items-center gap-2">
              {knownCount > 0 && (
                <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                  在庫情報あり {knownCount}件
                </span>
              )}
              {!isSearchMode && (
                filterGachaIds.length > 0 && onClearFilter ? (
                  <button
                    onClick={onClearFilter}
                    style={{
                      fontSize: 10, fontWeight: 700, color: '#F2B800',
                      background: '#FFF8E1', border: '1px solid #F2B800',
                      borderRadius: 99, padding: '2px 8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                    フィルター解除
                  </button>
                ) : onOpenFilter ? (
                  <button
                    onClick={onOpenFilter}
                    style={{
                      fontSize: 10, fontWeight: 700, color: '#888',
                      background: '#F5F3ED', border: '1px solid #E0E0E0',
                      borderRadius: 99, padding: '2px 8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                    フィルター
                  </button>
                ) : null
              )}
            </div>
          </div>

          {isEmpty ? (
            <div className="py-10 text-center">
              <p style={{ fontSize: 14, color: '#aaa' }}>
                {isSearchMode ? 'このガチャ/ジャンルは取り扱いがありません' : '商品情報がありません'}
              </p>
            </div>
          ) : (
            <>
              {isMobile && matchedGacha.length > 2 && (
                <style>{`
                  .spot-gacha-scroll::-webkit-scrollbar { height: 4px; }
                  .spot-gacha-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.07); border-radius: 2px; }
                  .spot-gacha-scroll::-webkit-scrollbar-thumb { background: #F2B800; border-radius: 2px; }
                `}</style>
              )}
              <div
                className={isMobile && matchedGacha.length > 2 ? 'spot-gacha-scroll' : ''}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  overflowX: 'auto',
                  scrollbarWidth: isMobile && matchedGacha.length > 2 ? 'thin' : 'none',
                  scrollbarColor: isMobile && matchedGacha.length > 2 ? '#F2B800 rgba(0,0,0,0.07)' : undefined,
                }}
              >
                {matchedGacha.map(g => (
                  <SpotGachaCard key={g.id} gacha={g} stockStatus={spot.stockMap[g.id] ?? null} isMobile={isMobile} mode="scroll" />
                ))}
              </div>
            </>
          )}

          {/* 店舗詳細ページへのボタン（常に表示） */}
          <div className="px-4 pb-2 pt-1">
            <button
              onClick={() => {
                const base = '/store/' + spot.id;
                const url = searchLabel
                  ? `${base}?contentSearch=${encodeURIComponent(searchLabel)}`
                  : base;
                router.push(url);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-bold"
              style={{ background: '#F5F3ED', color: '#555', border: 'none', cursor: 'pointer' }}>
              全商品を確認する（{allMatchedGacha.length}件）
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="px-4 py-2 text-[13px] font-bold mt-2"
            style={{ color: '#888', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
            この店に聞く
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#F5F5F5' }}>
              <span className="text-[13px] flex-1" style={{ color: '#aaa' }}>列は？在庫は？近くの人に聞く</span>
              <span className="text-[12px] px-2 py-1 rounded-full font-bold" style={{ background: '#F2B800', color: 'white' }}>質問</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-8 pt-3 flex-shrink-0" style={{ borderTop: '1px solid #F0F0F0' }}>
          <button onClick={() => setNavOpen(true)}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: '#E8F4FD', color: '#0891b2', minWidth: 72 }}>
            <Navigation size={15} />経路
          </button>
          {spot.phone && (
            <a href={'tel:' + spot.phone.replace(/[^\d+]/g, '')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[14px] font-bold"
              style={{ background: '#E8F5E9', color: '#16a34a', minWidth: 72, textDecoration: 'none' }}>
              <Phone size={15} />電話
            </a>
          )}
          <button className="flex-1 py-3 rounded-2xl text-[14px] font-bold" style={{ background: '#F5F3ED', color: '#555' }}>
            在庫を報告
          </button>
          <button className="flex-1 py-3 rounded-2xl text-[14px] font-bold" style={{ background: '#F2B800', color: 'white' }}>
            引いた！
          </button>
        </div>
      </div>
      {navOpen && <NavPickerModal lat={spot.lat} lng={spot.lng} name={spot.name} currentPos={currentPos} onClose={() => setNavOpen(false)} />}
    </>
  );
}
