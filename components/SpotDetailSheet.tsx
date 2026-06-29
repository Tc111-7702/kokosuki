'use client';

import { useRef, useState } from 'react';
import { X, MapPin, Navigation, Phone } from 'lucide-react';

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
  currentPos?: { lat: number; lng: number } | null;
  onClose: () => void;
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

function ipGradient(ipName: string): [string, string] {
  let h = 0;
  for (let i = 0; i < ipName.length; i++) { h = ipName.charCodeAt(i) + ((h << 5) - h); }
  const hue = Math.abs(h) % 360;
  return [`hsl(${hue},70%,60%)`, `hsl(${(hue + 40) % 360},65%,45%)`];
}

// ─── 在庫バッジ ───────────────────────────────────────────────────────────────

function StockBadge({ status }: { status: string | null }) {
  if (status === 'in_stock') {
    return (
      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(22,163,74,0.92)', borderRadius: 20, padding: '2px 8px' }}>
        <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>〇 在庫あり</span>
      </div>
    );
  }
  if (status === 'low_stock') {
    return (
      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(234,88,12,0.92)', borderRadius: 20, padding: '2px 8px' }}>
        <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>△ 残りわずか</span>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(100,100,100,0.72)', borderRadius: 20, padding: '2px 8px' }}>
      <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>在庫情報不明</span>
    </div>
  );
}

// ─── 商品カード ───────────────────────────────────────────────────────────────

function GachaCard({ gacha, stockStatus }: { gacha: GachaInfo; stockStatus: string | null }) {
  const [from, to] = ipGradient(gacha.ipName);
  return (
    <div className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width: 320, borderRadius: 20, background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
      <div style={{ width: '100%', height: 300, background: `linear-gradient(135deg, ${from}, ${to})`, position: 'relative', overflow: 'hidden' }}>
        {gacha.imageUrl && (
          <img src={gacha.imageUrl} alt={gacha.seriesName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <StockBadge status={stockStatus} />
      </div>
      <div className="flex flex-col p-2" style={{ gap: 2 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
          {gacha.seriesName}
        </p>
        <p style={{ fontSize: 10, color: '#aaa' }}>{gacha.ipName}</p>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

function NavPickerModal({ spot, currentPos, onClose }: {
  spot: SpotDetail;
  currentPos?: { lat: number; lng: number } | null;
  onClose: () => void;
}) {
  const dst = `${spot.lat},${spot.lng}`;
  const src = currentPos ? `${currentPos.lat},${currentPos.lng}` : '';

  const apps = [
    {
      name: 'Google マップ',
      icon: '🗺️',
      url: src
        ? `https://www.google.com/maps/dir/?api=1&origin=${src}&destination=${dst}&travelmode=walking`
        : `https://www.google.com/maps/dir/?api=1&destination=${dst}&travelmode=walking`,
    },
    {
      name: 'Yahoo! カーナビ',
      icon: '🧭',
      url: `https://map.yahoo.co.jp/route/walk?from=${src}&to=${dst}`,
    },
    {
      name: 'Apple マップ',
      icon: '🍎',
      url: `https://maps.apple.com/?daddr=${dst}${src ? `&saddr=${src}` : ''}&dirflg=w`,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col"
        style={{ background: 'white', borderRadius: '20px 20px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.2)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
        </div>
        <div className="px-4 pt-2 pb-1">
          <p className="text-[15px] font-black" style={{ color: '#1a1a1a' }}>経路アプリを選択</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#aaa' }}>{spot.name}</p>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3">
          {apps.map(app => (
            <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: '#F5F3ED', textDecoration: 'none' }}>
              <span className="text-[15px] font-bold" style={{ color: '#1a1a1a' }}>{app.name}</span>
            </a>
          ))}
        </div>
        <div className="px-4 pb-8 pt-1">
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: '#F0F0F0', color: '#888' }}>
            キャンセル
          </button>
        </div>
      </div>
    </>
  );
}

export default function SpotDetailSheet({ spot, gachaMap, filterGachaIds, searchOverrideIds, currentPos, onClose }: SpotDetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  if (!spot) return null;

  // searchOverrideIds がある場合はそれだけ表示、ない場合は通常フィルター
  const matchedGacha = spot.gachaIds
    .filter(id => {
      if (searchOverrideIds != null) return searchOverrideIds.includes(id);
      return filterGachaIds.length === 0 || filterGachaIds.includes(id);
    })
    .map(id => gachaMap.get(id))
    .filter((g): g is GachaInfo => g !== undefined)
    .slice(0, 30);

  const knownCount = matchedGacha.filter(g => spot.stockMap[g.id]).length;
  const isSearchMode = searchOverrideIds != null;
  const isEmpty = matchedGacha.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose} />
      <div ref={sheetRef} className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ background: 'white', borderRadius: '20px 20px 0 0', maxHeight: '82vh', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
        </div>

        <div className="flex items-start justify-between px-4 pt-2 pb-3 flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="px-4 py-2 text-[13px] font-bold flex items-center justify-between"
            style={{ color: '#888', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
            <span>{isSearchMode ? '検索結果' : '取扱商品'} {isEmpty ? 0 : matchedGacha.length}件</span>
            {knownCount > 0 && (
              <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                在庫情報あり {knownCount}件
              </span>
            )}
          </div>

          {isEmpty ? (
            <div className="py-10 text-center">
              <p style={{ fontSize: 14, color: '#aaa' }}>
                {isSearchMode ? 'このガチャ/ジャンルは取り扱いがありません' : '商品情報がありません'}
              </p>
            </div>
          ) : (
            <div className="flex gap-3 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {matchedGacha.map(g => (
                <GachaCard key={g.id} gacha={g} stockStatus={spot.stockMap[g.id] ?? null} />
              ))}
            </div>
          )}

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
            <a href={`tel:${spot.phone.replace(/[^\d+]/g, '')}`}
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
      {navOpen && <NavPickerModal spot={spot} currentPos={currentPos} onClose={() => setNavOpen(false)} />}
    </>
  );
}
