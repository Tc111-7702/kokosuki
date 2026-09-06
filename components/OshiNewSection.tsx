'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { GachaCard } from '@/components/ui/GachaCard';
import type { GachaItem } from '@/components/ui/GachaCard';
import { useIsMobile } from '@/lib/useIsMobile';

interface Group {
  ipName: string;
  gachas: GachaItem[];
}

const MOBILE_BREAKPOINT = 768;
const NARROW_BREAKPOINT = 341; // 340px以下でカードを縮小して3枚目を覗かせる

export function OshiNewSection() {
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [noFav, setNoFav]     = useState(false);
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const isNarrow = useIsMobile(NARROW_BREAKPOINT);

  useEffect(() => {
    fetch('/api/gacha/recommended')
      .then(r => r.json())
      .then(data => {
        if (data.groups?.length) {
          setGroups(data.groups);
        } else {
          setNoFav(true);
        }
        setLoading(false);
      })
      .catch(() => { setNoFav(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ paddingTop: isMobile ? 24 : 34, paddingBottom: 16, paddingLeft: 20, paddingRight: 20, color: '#BBB', fontSize: 13, fontWeight: 700 }}>読み込み中…</div>
  );

  if (noFav || groups.length === 0) return (
    <div style={{ margin: '0 16px', paddingTop: isMobile ? 24 : 34 }}>
      <div style={{ borderRadius: 18, padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
        background: 'white', border: '1.5px dashed #E5E0D0' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: '#FFF7E0' }}>
          <Heart size={18} color="#F2B800" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>お気に入りを登録しよう</p>
          <p style={{ fontSize: 11, color: '#AAA', margin: '4px 0 0' }}>
            気になるガチャをハートで保存すると、あなた専用のおすすめが表示されます
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* セクションヘッダー（固定） */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#FFFEEF',
        padding: `${isMobile ? 24 : 34}px 0 ${isMobile ? 16 : 24}px ${isMobile ? 16 : 24}px`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ display: 'block', width: 20, height: 3, borderRadius: 2, background: '#F2B800' }} />
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: '#F2B800', margin: 0 }}>Recommended for you</p>
        </div>
        <p style={{ fontSize: isMobile ? 24 : 34, fontWeight: 900, lineHeight: 1, margin: 0, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #7B3F00 0%, #C8780A 55%, #F2B800 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', display: 'inline-block' }}>あなたへのおすすめ</p>
      </div>

      {/* IP別セクション（モバイルは右marginを除去して横スクロールを右端まで見切れさせる） */}
      <div style={{ margin: isMobile ? '0 0 0 16px' : '0 16px', paddingTop: isMobile ? 16 : 32 }}>
        {groups.map((group, i) => (
          <IpGroup key={group.ipName} group={group} isMobile={isMobile} narrow={isNarrow} isLast={i === groups.length - 1} />
        ))}
      </div>
    </div>
  );
}

function IpGroup({ group, isMobile, narrow, isLast }: { group: Group; isMobile: boolean; narrow: boolean; isLast: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollRatio, setScrollRatio] = useState(0);

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

  return (
    <div style={{ marginBottom: isLast ? 0 : (isMobile ? 28 : 40) }}>
      {/* IPヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 16 : 20 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#F2B800', whiteSpace: 'nowrap' }}>
          {group.ipName}
        </span>
        <div style={{ flex: 1, height: 1, background: '#EDE9D8' }} />
      </div>

      {/* 横スクロール（スクロールバーは常に非表示・スワイプ/矢印で操作） */}
      <style>{`
        .ip-scroll-${group.ipName.replace(/[^a-zA-Z0-9]/g, '')}::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`ip-scroll-${group.ipName.replace(/[^a-zA-Z0-9]/g, '')}`}
        style={{
          display: 'flex', gap: isMobile ? 12 : 32, overflowX: 'auto',
          paddingBottom: isMobile ? 10 : 10,
          scrollbarWidth: 'none',
        }}
      >
        {group.gachas.map((item, rank) => (
          <GachaCard key={item.id} gacha={item} rank={rank} showRank={false} isMobile={isMobile} narrow={narrow} />
        ))}
      </div>

      {/* デスクトップ矢印 */}
      {!isMobile && group.gachas.length > 2 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <button onClick={() => slide('left')} style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDD',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#555',
          }}>‹</button>
          <div style={{ flex: 1, maxWidth: 560, height: 6, background: '#E5E5E5', borderRadius: 3, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, height: '100%', borderRadius: 3,
              background: '#F2B800', width: '30%',
              left: `${scrollRatio * 70}%`,
              transition: 'left 100ms',
            }} />
          </div>
          <button onClick={() => slide('right')} style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #DDD',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#555',
          }}>›</button>
        </div>
      )}
    </div>
  );
}
