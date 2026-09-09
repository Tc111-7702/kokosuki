'use client';

import { useRouter } from 'next/navigation';

export type GachaItem = {
  id: string;
  seriesName: string;
  ipName: string;
  imageUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  likeCount: number;
  status: string;
  releaseDate: string | null;
};

const STATUS_LABEL: Record<string, string> = { on_sale: '発売中', coming_soon: 'もうすぐ', ended: '終了' };
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  on_sale:     { bg: '#E8F5E9', text: '#2E7D32' },
  coming_soon: { bg: '#FFF8E1', text: '#F57F17' },
  ended:       { bg: '#EEEEEE', text: '#757575' },
};

interface GachaCardProps {
  gacha: GachaItem;
  rank: number;
  showRank: boolean;
  isMobile: boolean;
  narrow?: boolean;        // 極小画面(≤340px)。3枚目が見えるようカードを縮小する
  onClick?: () => void;    // 指定時は詳細遷移の代わりにこれを呼ぶ（掲載ピッカー等で使用）
  badgeLabel?: string;     // 指定時はステータスバッジの代わりに固定ラベルを表示（例: 今秋発売）
  variant?: 'default' | 'favorite'; // favorite: おきにいりカードと同じ見た目（正方形画像・順位なし）
}

// おきにいりカード風バッジの色
function favoriteBadge(status: string, badgeLabel?: string): { label: string; bg: string } {
  const isSale = status === 'on_sale' || (badgeLabel ? badgeLabel.includes('発売') && !badgeLabel.includes('予定') : false);
  const isSoon = status === 'coming_soon' || (badgeLabel ? badgeLabel.includes('予定') : false);
  return {
    label: badgeLabel ?? (STATUS_LABEL[status] ?? status),
    bg: isSale ? '#22c55e' : isSoon ? '#F2B800' : '#aaa',
  };
}

export function GachaCard({ gacha, rank, showRank, isMobile, narrow = false, onClick, badgeLabel, variant = 'default' }: GachaCardProps) {
  const router = useRouter();
  const go = onClick ?? (() => router.push(`/gacha/${gacha.id}`));

  // おきにいりタブと同じ見た目のカード（正方形画像・左上バッジ・順位番号なし）
  if (variant === 'favorite') {
    const favW = isMobile ? (narrow ? 132 : 168) : 300;
    const fav = favoriteBadge(gacha.status, badgeLabel);
    return (
      <div onClick={go} style={{ flexShrink: 0, width: favW, cursor: 'pointer' }}>
        <div
          className="flex flex-col rounded-2xl overflow-hidden w-full transition-transform"
          style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div className="relative w-full" style={{ paddingBottom: '100%' }}>
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})` }} />
            {gacha.imageUrl && (
              <img
                src={gacha.imageUrl}
                alt={gacha.seriesName}
                className="absolute inset-0 w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white" style={{ fontSize: 9, fontWeight: 700, background: fav.bg }}>
              {fav.label}
            </div>
          </div>
          <div className="px-2 py-1.5">
            <p style={{ fontSize: 9, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>{gacha.ipName}</p>
            <p style={{ fontSize: 11, color: '#222', fontWeight: 700, lineHeight: 1.3 }} className="line-clamp-2">
              {gacha.seriesName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // narrow は極小画面用の縮小サイズ（モバイル時のみ有効）。3枚目が少し覗く幅にする。
  const cardW  = isMobile ? (narrow ? 116 : 140) : 320;
  const imgH   = isMobile ? (narrow ? 130 : 158) : 320;
  const radius = isMobile ? 16 : 10;
  const st = STATUS_STYLE[gacha.status] ?? STATUS_STYLE.ended;

  return (
    <div
      onClick={onClick ?? (() => router.push(`/gacha/${gacha.id}`))}
      style={{
        flexShrink: 0, width: cardW, borderRadius: radius, overflow: 'hidden',
        background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', cursor: 'pointer',
        transition: 'transform 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{
        position: 'relative', width: '100%', height: imgH,
        background: `linear-gradient(135deg, ${gacha.gradientFrom}, ${gacha.gradientTo})`,
      }}>
        {gacha.imageUrl && (
          <img
            src={gacha.imageUrl}
            alt={gacha.seriesName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {showRank && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            width: isMobile ? 24 : 30, height: isMobile ? 24 : 30,
            borderRadius: isMobile ? 8 : 6,
            background: rank < 3 ? '#F2B800' : 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: isMobile ? 11 : 14, fontWeight: 900, color: rank < 3 ? '#7B3F00' : '#fff' }}>
              {rank + 1}
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            padding: isMobile ? '3px 7px' : '4px 10px', borderRadius: 99,
            fontSize: isMobile ? 10 : 11, fontWeight: 800,
            background: badgeLabel || gacha.status === 'coming_soon' ? '#EEF2FF' : st.bg,
            color: badgeLabel || gacha.status === 'coming_soon' ? '#4F46E5' : st.text,
          }}>
            {badgeLabel
              ? badgeLabel
              : gacha.releaseDate
              ? `${new Date(gacha.releaseDate).getMonth() + 1}/${new Date(gacha.releaseDate).getDate()}発売予定`
              : gacha.status === 'coming_soon' ? '発売予定' : STATUS_LABEL[gacha.status] ?? gacha.status}
          </span>
        </div>
      </div>
      <div style={{ padding: isMobile ? '8px 10px 10px' : '10px 14px 12px' }}>
        <p style={{ fontSize: isMobile ? 10 : 11, color: '#AAA', margin: '0 0 3px', fontWeight: 600 }}>
          {gacha.ipName}
        </p>
        <p style={{
          fontSize: isMobile ? 12 : 14, fontWeight: 800, color: '#1A1A1A', margin: 0,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', lineHeight: '1.4',
        }}>
          {gacha.seriesName}
        </p>
      </div>
    </div>
  );
}
