'use client';

import { useRouter } from 'next/navigation';

// ─── 型定義（エクスポート） ──────────────────────────────────────────────────

export interface SpotGachaInfo {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function ipGradient(ipName: string): [string, string] {
  let h = 0;
  for (let i = 0; i < ipName.length; i++) { h = ipName.charCodeAt(i) + ((h << 5) - h); }
  const hue = Math.abs(h) % 360;
  return [`hsl(${hue},70%,60%)`, `hsl(${(hue + 40) % 360},65%,45%)`];
}

// ─── 在庫バッジ ───────────────────────────────────────────────────────────────

export function SpotStockBadge({ status }: { status: string | null }) {
  if (status === 'in_stock') return (
    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(22,163,74,0.92)', borderRadius: 20, padding: '2px 8px' }}>
      <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>〇 在庫あり</span>
    </div>
  );
  if (status === 'low_stock') return (
    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(234,88,12,0.92)', borderRadius: 20, padding: '2px 8px' }}>
      <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>△ 残りわずか</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(100,100,100,0.72)', borderRadius: 20, padding: '2px 8px' }}>
      <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>在庫情報不明</span>
    </div>
  );
}

// ─── SpotGachaCard ─────────────────────────────────────────────────────────────
//
// mode='scroll': 水平スクロール用（固定幅）
//   isMobile=true  → 160×180px, radius 16
//   isMobile=false → 320×320px, radius 10  ※ ホームのGachaCardと同サイズ
//
// mode='grid': グリッド用（幅は親に従う・正方形）
//   isMobile問わず padding-bottom:100% で正方形
//

interface SpotGachaCardProps {
  gacha: SpotGachaInfo;
  stockStatus: string | null;
  isMobile?: boolean;
  mode?: 'scroll' | 'grid';
  highlight?: boolean; // 検索ヒット時に黄色ボーダー表示
  compact?: boolean;   // 底面シート用コンパクトサイズ
}

export function SpotGachaCard({ gacha, stockStatus, isMobile = false, mode = 'scroll', highlight = false, compact = false }: SpotGachaCardProps) {
  const router = useRouter();
  const [from, to] = ipGradient(gacha.ipName);

  // scroll モード用サイズ
  const cardW  = isMobile ? 160 : 320;
  const imgH   = isMobile ? 180 : 320;
  const radius = mode === 'grid' ? 16 : (isMobile ? 16 : 10);

  const textPad = isMobile || mode === 'grid' ? '8px 10px 10px' : '10px 14px 12px';
  const ipSize  = isMobile || mode === 'grid' ? 10 : 11;
  const nameSize= isMobile || mode === 'grid' ? 12 : 14;

  return (
    <div
      onClick={() => router.push(`/gacha/${gacha.id}`)}
      style={{
        ...(mode === 'scroll' ? { flexShrink: 0, width: cardW } : {}),
        borderRadius: radius,
        overflow: 'hidden',
        background: 'white',
        boxShadow: highlight
          ? '0 2px 10px rgba(242,184,0,0.35)'
          : '0 2px 10px rgba(0,0,0,0.08)',
        border: highlight ? '2px solid #F2B800' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'transform 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* 画像エリア */}
      {mode === 'scroll' ? (
        // 固定高さ
        <div style={{
          position: 'relative', width: '100%', height: imgH,
          background: `linear-gradient(135deg, ${from}, ${to})`,
          overflow: 'hidden',
        }}>
          {gacha.imageUrl && (
            <img src={gacha.imageUrl} alt={gacha.seriesName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <SpotStockBadge status={stockStatus} />
        </div>
      ) : (
        // 正方形（padding-bottom trick）
        <div style={{
          position: 'relative', width: '100%', paddingBottom: '100%',
          background: `linear-gradient(135deg, ${from}, ${to})`,
          overflow: 'hidden',
        }}>
          {gacha.imageUrl && (
            <img src={gacha.imageUrl} alt={gacha.seriesName}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <SpotStockBadge status={stockStatus} />
        </div>
      )}

      {/* テキストエリア（compactモードでは非表示） */}
      {!compact && (
        <div style={{ padding: textPad }}>
          <p style={{ fontSize: ipSize, color: '#AAA', margin: '0 0 3px', fontWeight: 600 }}>
            {gacha.ipName}
          </p>
          <p style={{
            fontSize: nameSize, fontWeight: 800, color: '#1a1a1a',
            margin: 0, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {gacha.seriesName}
          </p>
        </div>
      )}
    </div>
  );
}
