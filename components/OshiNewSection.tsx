'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';

type Gacha = {
  id: string; seriesName: string; ipName: string;
  imageUrl: string | null; gradientFrom: string; gradientTo: string;
  likeCount: number; status: string;
};

const STATUS_LABEL: Record<string, string> = { on_sale: '発売中', coming_soon: 'もうすぐ', ended: '終了' };
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  on_sale:     { bg: '#E8F5E9', text: '#2E7D32' },
  coming_soon: { bg: '#FFF8E1', text: '#F57F17' },
  ended:       { bg: '#EEEEEE', text: '#757575' },
};

const CARD_ACTIVE   = 540;
const CARD_INACTIVE = 370;
const GAP = 20;
const VISIBLE = 2; // アクティブの左右何枚まで表示するか

function centerOffset(pos: number, ca: number, ci: number): number {
  if (pos === 0) return 0;
  const sign = pos > 0 ? 1 : -1;
  const n = Math.abs(pos);
  return sign * (ca / 2 + GAP + ci / 2 + (n - 1) * (ci + GAP));
}

// カードiのposを循環込みで計算（-n/2 〜 n/2 の範囲に収める）
function wrappedPos(i: number, index: number, n: number): number {
  let pos = ((i - index) % n + n) % n; // [0, n)
  if (pos > n / 2) pos -= n;           // (-n/2, n/2]
  return pos;
}

export function OshiNewSection() {
  const router = useRouter();
  const [gachas, setGachas]   = useState<Gacha[]>([]);
  const [loading, setLoading] = useState(true);
  const [noFav, setNoFav]     = useState(false);
  const [index, setIndex]     = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileCardW, setMobileCardW] = useState(300);
  const startXRef    = useRef<number | null>(null);
  const isDragging   = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/gacha/recommended')
      .then(r => r.json())
      .then(data => {
        if (data.gachas?.length) { setGachas(data.gachas); setLoading(false); return; }
        return fetch('/api/gacha/popular?limit=20').then(r => r.json()).then(d => {
          setGachas(d.gachas?.length ? d.gachas : []);
          if (!d.gachas?.length) setNoFav(true);
          setLoading(false);
        });
      })
      .catch(() => { setNoFav(true); setLoading(false); });
  }, []);

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    if (gachas.length <= 1) return;
    autoTimerRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % gachas.length);
    }, 7000);
  }, [gachas.length, stopAuto]);

  useEffect(() => { startAuto(); return stopAuto; }, [startAuto, stopAuto]);

  // タブ非表示・別アプリ切替時にスライドを停止、復帰時に再開
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopAuto();
      } else {
        startAuto();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [startAuto, stopAuto]);

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      // margin: 0 16px 分を引いた幅
      setMobileCardW(Math.max(200, window.innerWidth - 32));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);


  const go = useCallback((i: number) => {
    const n = gachas.length;
    if (n === 0) return;
    stopAuto();
    setIndex(((i % n) + n) % n); // 循環: 0未満や n以上も正しくラップ
    startAuto();
  }, [gachas.length, stopAuto, startAuto]);

  const onPointerDown = (e: React.PointerEvent) => { startXRef.current = e.clientX; isDragging.current = false; };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startXRef.current !== null && Math.abs(e.clientX - startXRef.current) > 5) isDragging.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? index + 1 : index - 1);
  };

  if (loading) return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '48px 0', color: '#BBB', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em' }}>
      読み込み中…
    </div>
  );
  if (noFav || gachas.length === 0) return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ borderRadius: 18, padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
        background: 'white', border: '1.5px dashed #E5E0D0' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: '#FFF7E0' }}>
          <Heart size={18} color="#F2B800" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>お気に入りを登録しよう</p>
          <p style={{ fontSize: 11, color: '#AAA', margin: '4px 0 0' }}>気になるIPをハートで保存すると、あなた専用のフィードが生まれます</p>
        </div>
      </div>
    </div>
  );

  const n = gachas.length;
  const cardActive   = isMobile ? mobileCardW : CARD_ACTIVE;
  const cardInactive = isMobile ? Math.round(mobileCardW * 0.78) : CARD_INACTIVE;
  // モバイルは正方形（デバイス幅基準）、デスクトップは固定高さ
  const wrapH = cardActive + 8;

  return (
    <div style={{
      userSelect: 'none',
      position: 'relative',
      borderRadius: 20,
      margin: '0 16px',
      backgroundImage: 'radial-gradient(circle, rgba(242,184,0,0.22) 1px, transparent 1px), linear-gradient(135deg, #FFFBF0 0%, #FFF3D0 100%)',
      backgroundSize: '22px 22px, cover',
      boxShadow: '0 2px 20px rgba(242,184,0,0.12)',
    }}>
      {/* ヘッダー */}
      <div style={{
        paddingTop: isMobile ? 4 : 8,
        paddingLeft: isMobile ? 12 : 36,
        paddingRight: isMobile ? 0 : 24,
        paddingBottom: isMobile ? 24 : 32,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ display: 'block', width: 24, height: 3, borderRadius: 2,
              background: gachas[index]?.gradientFrom ?? '#F2B800' }} />
            <p style={{ fontSize: isMobile ? 9 : 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: gachas[index]?.gradientFrom ?? '#F2B800', margin: 0 }}>Recommended for you</p>
          </div>
          <p style={{ fontSize: isMobile ? 24 : 40, fontWeight: 900, lineHeight: 1, margin: 0, letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #7B3F00 0%, #C8780A 55%, #F2B800 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', display: 'inline-block' }}>あなたへのおすすめ</p>
        </div>
        {!isMobile && <span style={{ fontSize: 12, color: '#CCC', fontWeight: 700, paddingBottom: 6,
          letterSpacing: '0.05em' }}>{index + 1}<span style={{ color: '#DDD', margin: '0 3px' }}>/</span>{n}</span>}
      </div>

      {/* カルーセル + 矢印オーバーレイ（モバイル） */}
      <div style={{ position: 'relative' }}>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { startXRef.current = null; }}
          style={{ position: 'relative', width: '100%', height: wrapH, overflow: 'hidden', cursor: 'grab' }}
        >
          {gachas.map((item, i) => {
            const pos = wrappedPos(i, index, n);
            const isActive = pos === 0;
            const isVisible = Math.abs(pos) <= VISIBLE;
            const w = isActive ? cardActive : cardInactive;
            const cardH = w;
            const offset = centerOffset(pos, cardActive, cardInactive);
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.ended;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isDragging.current) return;
                  if (isActive) router.push(`/gacha/${item.id}`);
                  else go(i);
                }}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${offset - w / 2}px)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: w,
                  height: cardH,
                  opacity: isVisible ? 1 : 0,
                  pointerEvents: isVisible ? 'auto' : 'none',
                  transition: 'left 550ms cubic-bezier(0.4,0,0.2,1), width 550ms, height 550ms, opacity 400ms',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: 56,
                  overflow: 'hidden',
                  WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                }}>
                  <div style={{ position: 'absolute', inset: 0,
                    background: `linear-gradient(150deg, ${item.gradientFrom}, ${item.gradientTo})` }} />
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.seriesName} draggable={false}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover', objectPosition: 'center' }}
                    />
                  )}
                  <div style={{ position: 'absolute', top: 14, left: 20 }}>
                    <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 900,
                      background: st.bg, color: st.text }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 矢印ナビ（モバイルのみ・カルーセル下） */}
      {isMobile && n > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, paddingTop: 16 }}>
          <button
            onClick={() => go(index - 1)}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <ChevronLeft size={26} color="#555" strokeWidth={2.5} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>{index + 1}/{n}</span>
          <button
            onClick={() => go(index + 1)}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <ChevronRight size={26} color="#555" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* デスクトップドット */}
      {!isMobile && n > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, paddingTop: 24, paddingBottom: 36 }}>
          {gachas.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                height: 12, width: i === index ? 30 : 12,
                borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
                background: i === index
                  ? (gachas[index]?.gradientFrom ?? '#F2B800')
                  : 'rgba(0,0,0,0.15)',
                transition: 'width 300ms, background 300ms',
              }}
            />
          ))}
        </div>
      )}

      {isMobile && <div style={{ height: 24 }} />}
    </div>
  );
}
