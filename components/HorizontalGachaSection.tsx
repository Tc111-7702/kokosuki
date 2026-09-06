'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GachaCard, type GachaItem as Gacha } from '@/components/ui/GachaCard';
import { useIsMobile } from '@/lib/useIsMobile';

interface Props {
  title: string;
  subtitle: string;
  color: string;
  colorDark: string;
  colorMid: string;
  apiUrl: string;
  scrollId: string;    // CSSクラス名に使う一意ID 例: "trending" | "coming-soon"
  showRank?: boolean;
  badgeLabel?: string; // 指定時は各カードのバッジを固定ラベルに（例: 今秋発売）
}

export function HorizontalGachaSection({ title, subtitle, color, colorDark, colorMid, apiUrl, scrollId, showRank = true, badgeLabel }: Props) {
  const [gachas, setGachas] = useState<Gacha[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [scrollRatio, setScrollRatio] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollClass = `h-gacha-scroll-${scrollId}`;

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => { setGachas(d.gachas ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollRatio(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  const slide = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = isMobile ? 160 + 12 : 320 + 32;
    el.scrollBy({ left: dir === 'right' ? cardW * 2 : -cardW * 2, behavior: 'smooth' });
  };

  if (loading) return (
    <div style={{ padding: '16px 20px', color: '#BBB', fontSize: 13, fontWeight: 700 }}>読み込み中…</div>
  );
  if (gachas.length === 0) return null;

  const cls = scrollClass;

  return (
    <div style={{ marginLeft: 16, marginRight: isMobile ? 0 : 16 }}>
      {/* ヘッダー */}
      <div style={{ paddingTop: isMobile ? 24 : 34, paddingBottom: isMobile ? 16 : 24, paddingLeft: isMobile ? 4 : 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ display: 'block', width: 20, height: 3, borderRadius: 2, background: color }} />
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
            color, margin: 0 }}>{subtitle}</p>
        </div>
        <p style={{ fontSize: isMobile ? 24 : 34, fontWeight: 900, lineHeight: 1, margin: 0, letterSpacing: '-0.03em',
          background: `linear-gradient(135deg, ${colorDark} 0%, ${colorMid} 55%, ${color} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', display: 'inline-block' }}>{title}</p>
      </div>

      {/* 横スクロールグリッド */}
      <style>{`
        .${cls}::-webkit-scrollbar { height: ${isMobile ? '4px' : '0px'}; }
        .${cls}::-webkit-scrollbar-track { background: rgba(0,0,0,0.07); border-radius: 2px; }
        .${cls}::-webkit-scrollbar-thumb { background: ${color}; border-radius: 2px; opacity: 0.7; }
      `}</style>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cls}
        style={{
          display: 'flex', gap: isMobile ? 12 : 32, overflowX: 'auto',
          paddingBottom: isMobile ? 10 : 10,
          scrollbarWidth: isMobile ? 'thin' : 'none',
          scrollbarColor: isMobile ? `${color} rgba(0,0,0,0.07)` : undefined,
        }}
      >
        {gachas.map((item, rank) => (
          <GachaCard key={item.id} gacha={item} rank={rank} showRank={showRank} isMobile={isMobile} badgeLabel={badgeLabel} />
        ))}
      </div>

      {/* 矢印＋プログレスバー（デスクトップのみ） */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
          <button onClick={() => slide('left')} style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDD',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#555', transition: 'border-color 150ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#999')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDD')}
          >‹</button>

          <div style={{ flex: 1, maxWidth: 560, height: 6, background: '#E5E5E5', borderRadius: 3, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, height: '100%', borderRadius: 3,
              background: color, width: '30%',
              left: `${scrollRatio * 70}%`,
              transition: 'left 100ms',
            }} />
          </div>

          <button onClick={() => slide('right')} style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDD',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#555', transition: 'border-color 150ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#999')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDD')}
          >›</button>
        </div>
      )}
    </div>
  );
}
