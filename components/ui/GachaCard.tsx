'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useLikedGachas } from '@/lib/useLikedGachas';

// カード用のいいね（ハート）ボタン。タップでいいねトグル（カード遷移はしない）。
function GachaLikeButton({ gachaId }: { gachaId: string }) {
  const { isLiked, toggle } = useLikedGachas();
  const liked = isLiked(gachaId);
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); toggle(gachaId); }}
      aria-label={liked ? 'いいねを取り消す' : 'いいね'}
      className="flex items-center justify-center rounded-full active:scale-90"
      style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.92)', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'transform 0.1s' }}
    >
      <Heart size={16} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : '#999'} strokeWidth={2.2} />
    </button>
  );
}

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

// 発売状況ラベル（status 由来。発売中 / 発売予定 / 終了 のみ）
const STATUS_LABEL: Record<string, string> = { on_sale: '発売中', coming_soon: '発売予定', ended: '終了' };

// ホームのガチャカードと同じ発売状況タグ（ホーム・おきにいり共通で使う）。
// タグは status から決まる「発売中 / 発売予定 / 終了」のみ。日付表示はしない。
// badgeLabel を渡した場合のみ、その固定ラベル（例: 今週発売）を表示する。
export function GachaStatusBadge({
  status,
  badgeLabel,
  isMobile = true,
}: {
  status: string;
  badgeLabel?: string;
  isMobile?: boolean;
}) {
  const label = badgeLabel ?? STATUS_LABEL[status] ?? '発売中';
  const tone =
    label === '終了'   ? { bg: '#EEEEEE', text: '#757575' }
    : label === '発売中' ? { bg: '#E8F5E9', text: '#2E7D32' }
    : { bg: '#EEF2FF', text: '#4F46E5' }; // 発売予定・今週発売 など
  return (
    <span
      style={{
        padding: isMobile ? '3px 7px' : '4px 10px', borderRadius: 99,
        fontSize: isMobile ? 10 : 11, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-block',
        background: tone.bg,
        color: tone.text,
      }}
    >
      {label}
    </span>
  );
}

interface GachaCardProps {
  gacha: GachaItem;
  rank: number;
  showRank: boolean;
  rankNumberInset?: number; // showRank 時の数字 left オフセット（HorizontalGachaSection と paddingLeft を同期）
  isMobile: boolean;
  narrow?: boolean;        // 極小画面(≤340px)。3枚目が見えるようカードを縮小する
  onClick?: () => void;    // 指定時は詳細遷移の代わりにこれを呼ぶ（掲載ピッカー等で使用）
  badgeLabel?: string;     // 指定時はステータスバッジの代わりに固定ラベルを表示（例: 今秋発売）
  variant?: 'default' | 'favorite'; // favorite: おきにいりカードと同じ見た目（正方形画像・順位なし）
  fullWidth?: boolean;    // favorite 時にグリッド等で幅100%にする
}

export function GachaCard({ gacha, rank, showRank, rankNumberInset, isMobile, narrow = false, onClick, badgeLabel, variant = 'default', fullWidth = false }: GachaCardProps) {
  const router = useRouter();
  const go = onClick ?? (() => router.push(`/gacha/${gacha.id}`));

  // おきにいりタブと同じ見た目のカード（正方形画像・左上バッジ・順位番号なし）
  if (variant === 'favorite') {
    const favWNum = isMobile ? (narrow ? 118 : 150) : 270;
    const favW = fullWidth ? '100%' : favWNum;
    return (
      <div onClick={go} style={{ flexShrink: fullWidth ? undefined : 0, width: favW, cursor: 'pointer' }}>
        {/* カードの上に小さくIP名（無い場合も1行分の高さを確保して揃える） */}
        <p className="px-0.5 mb-1 truncate" style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{gacha.ipName || ' '}</p>
        {/* isolation: カード内の z-index を封じ込め、sticky ヘッダー等の外側に影響させない */}
        <div className="relative" style={{ isolation: 'isolate' }}>
          {/* ランキング数字（カード背面・話題のガチャのみ） */}
          {showRank && (
            <span
              aria-hidden
              style={{
                position: 'absolute', zIndex: 0, left: -(rankNumberInset ?? Math.min(Math.round(favWNum * 0.34), isMobile ? 56 : 84)), bottom: 0,
                fontSize: Math.round(favWNum * 0.95), fontWeight: 900, color: '#F2B800',
                lineHeight: 1, pointerEvents: 'none', whiteSpace: 'nowrap',
              }}
            >
              {rank + 1}
            </span>
          )}
        <div
          className="relative z-10 flex flex-col rounded-2xl overflow-hidden w-full transition-transform"
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
            {/* 発売状況タグ（左上） */}
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <GachaStatusBadge status={gacha.status} badgeLabel={badgeLabel} isMobile={isMobile} />
            </div>
            {/* いいねボタン（右上） */}
            <div style={{ position: 'absolute', top: 6, right: 6 }}>
              <GachaLikeButton gachaId={gacha.id} />
            </div>
          </div>
          <div className="px-2 py-1.5">
            <p style={{ fontSize: 11, color: '#222', fontWeight: 700, lineHeight: 1.3 }} className="line-clamp-2">
              {gacha.seriesName}
            </p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // narrow は極小画面用の縮小サイズ（モバイル時のみ有効）。3枚目が少し覗く幅にする。
  const cardW  = isMobile ? (narrow ? 116 : 140) : 320;
  const imgH   = isMobile ? (narrow ? 130 : 158) : 320;
  const radius = isMobile ? 16 : 10;

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
          <GachaStatusBadge status={gacha.status} badgeLabel={badgeLabel} isMobile={isMobile} />
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
