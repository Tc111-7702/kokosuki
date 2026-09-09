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

const MOBILE_BREAKPOINT = 768;
const NARROW_BREAKPOINT = 341; // 340px以下でカードを縮小して3枚目を覗かせる

export function HorizontalGachaSection({ title, color, apiUrl, scrollId, showRank = true, badgeLabel }: Props) {
  const [gachas, setGachas] = useState<Gacha[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const isNarrow = useIsMobile(NARROW_BREAKPOINT);
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
    const cardW = isMobile ? 150 + 12 : 270 + 32;
    el.scrollBy({ left: dir === 'right' ? cardW * 2 : -cardW * 2, behavior: 'smooth' });
  };

  if (loading) return (
    <div style={{ padding: '16px 20px', color: '#BBB', fontSize: 13, fontWeight: 700 }}>読み込み中…</div>
  );
  if (gachas.length === 0) return null;

  const cls = scrollClass;

  return (
    <div style={{ marginLeft: 16, marginRight: isMobile ? 0 : 16 }}>
      {/* ヘッダー（簡素な黒文字タイトル） */}
      <div style={{ paddingTop: isMobile ? 12 : 16, paddingBottom: isMobile ? 6 : 8, paddingLeft: isMobile ? 4 : 8 }}>
        <p style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: '#111', margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
      </div>

      {/* 横スクロールグリッド（スクロールバーは常に非表示・スワイプ/矢印で操作） */}
      <style>{`
        .${cls}::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cls}
        style={{
          display: 'flex',
          // ランキング数字が左にはみ出す分、話題のガチャ(showRank)は gap と左余白を広げる
          gap: showRank ? (isMobile ? 46 : 66) : (isMobile ? 12 : 32),
          overflowX: 'auto',
          paddingBottom: 10,
          paddingLeft: showRank ? (isMobile ? 38 : 64) : 0,
          scrollbarWidth: 'none',
        }}
      >
        {gachas.map((item, rank) => (
          <GachaCard key={item.id} gacha={item} rank={rank} showRank={showRank} isMobile={isMobile} narrow={isNarrow} badgeLabel={badgeLabel} variant="favorite" />
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
