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
}

export function GachaCard({ gacha, rank, showRank, isMobile }: GachaCardProps) {
  const router = useRouter();
  const cardW  = isMobile ? 160 : 320;
  const imgH   = isMobile ? 180 : 320;
  const radius = isMobile ? 16 : 10;
  const st = STATUS_STYLE[gacha.status] ?? STATUS_STYLE.ended;

  return (
    <div
      onClick={() => router.push(`/gacha/${gacha.id}`)}
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
            background: gacha.status === 'coming_soon' ? '#EEF2FF' : st.bg,
            color: gacha.status === 'coming_soon' ? '#4F46E5' : st.text,
          }}>
            {gacha.releaseDate
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
