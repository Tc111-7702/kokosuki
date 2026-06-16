'use client';

import { useRef } from 'react';
import { X, MapPin } from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export interface SpotDetail {
  id: string;
  name: string;
  address: string;
  distance: number;
  googleMapsUrl: string | null;
  gachaIds: string[];
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
  onClose: () => void;
}

// ─── ユーティリティ ────────────────────────────────────────────────────────────

function fmtDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

/** ipName から決定論的なグラデーション色を生成 */
function ipGradient(ipName: string): [string, string] {
  let h = 0;
  for (let i = 0; i < ipName.length; i++) {
    h = ipName.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return [`hsl(${hue},70%,60%)`, `hsl(${(hue + 40) % 360},65%,45%)`];
}

// ─── 商品カード（横スクロール用・画像大） ─────────────────────────────────────

function GachaCard({ gacha }: { gacha: GachaInfo }) {
  const [from, to] = ipGradient(gacha.ipName);
  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        width: 320,
        borderRadius: 20,
        background: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      }}
    >
      {/* 画像エリア */}
      <div
        style={{
          width: '100%',
          height: 300,
          background: `linear-gradient(135deg, ${from}, ${to})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {gacha.imageUrl && (
          <img
            src={gacha.imageUrl}
            alt={gacha.seriesName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {/* 在庫バッジ */}
        <div
          style={{
            position: 'absolute', bottom: 6, left: 6,
            background: 'rgba(22,163,74,0.9)',
            borderRadius: 20, padding: '2px 7px',
          }}
        >
          <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>✓ 今ありそう</span>
        </div>
      </div>

      {/* テキストエリア */}
      <div className="flex flex-col p-2" style={{ gap: 2 }}>
        <p
          style={{
            fontSize: 12, fontWeight: 700, color: '#1a1a1a',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
          }}
        >
          {gacha.seriesName}
        </p>
        <p style={{ fontSize: 10, color: '#aaa' }}>{gacha.ipName}</p>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export default function SpotDetailSheet({
  spot,
  gachaMap,
  filterGachaIds,
  onClose,
}: SpotDetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!spot) return null;

  // このスポットでフィルターと一致する商品
  const matchedGacha = spot.gachaIds
    .filter((id) => filterGachaIds.length === 0 || filterGachaIds.includes(id))
    .map((id) => gachaMap.get(id))
    .filter((g): g is GachaInfo => g !== undefined)
    .slice(0, 30); // 最大30件表示

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onClick={onClose}
      />

      {/* シート */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          background: 'white',
          borderRadius: '20px 20px 0 0',
          maxHeight: '82vh',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
        </div>

        {/* ヘッダー */}
        <div className="flex items-start justify-between px-4 pt-2 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-[18px] font-black leading-tight" style={{ color: '#1a1a1a' }}>
              {spot.name}
            </h2>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={12} color="#aaa" />
              <p className="text-[12px] truncate" style={{ color: '#888' }}>{spot.address}</p>
            </div>
            <p className="text-[12px] font-semibold mt-1" style={{ color: '#0891b2' }}>
              現在地から {fmtDistance(spot.distance)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 flex-shrink-0">
            <X size={22} color="#555" />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {/* 商品一覧 */}
          <div
            className="px-4 py-2 text-[13px] font-bold"
            style={{ color: '#888', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}
          >
            取扱商品 {matchedGacha.length}件
          </div>

          {matchedGacha.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: '#aaa' }}>
              商品情報がありません
            </div>
          ) : (
            <div
              className="flex gap-3 px-4 py-3 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {matchedGacha.map((g) => <GachaCard key={g.id} gacha={g} />)}
            </div>
          )}

          {/* この店に聞く（モック） */}
          <div
            className="px-4 py-2 text-[13px] font-bold mt-2"
            style={{ color: '#888', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}
          >
            この店に聞く
          </div>
          <div className="px-4 py-3">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#F5F5F5' }}
            >
              <span className="text-[13px] flex-1" style={{ color: '#aaa' }}>
                列は？在庫は？近くの人に聞く
              </span>
              <span
                className="text-[12px] px-2 py-1 rounded-full font-bold"
                style={{ background: '#F2B800', color: 'white' }}
              >
                質問
              </span>
            </div>
          </div>
        </div>

        {/* フッターボタン */}
        <div
          className="flex gap-2 px-4 pb-8 pt-3 flex-shrink-0"
          style={{ borderTop: '1px solid #F0F0F0' }}
        >
          <button
            className="flex-1 py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: '#F5F3ED', color: '#555' }}
          >
            在庫を報告
          </button>
          <button
            className="flex-1 py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: '#F2B800', color: 'white' }}
          >
            引いた！
          </button>
        </div>
      </div>
    </>
  );
}
