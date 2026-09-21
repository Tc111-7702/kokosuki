'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PopularIpTagList, SearchTagsDivider } from '@/components/PopularIpTagList';
import { POST_GACHA_BODY_HEIGHT } from '@/lib/postFormMobileLayout';
import { StockSpotPanel } from '@/components/StockSpotPanel';
import { SpotGachaPicker } from '@/components/SpotGachaPicker';
import { useIsMobile } from '@/lib/useIsMobile';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

// 在庫報告の距離検証用に、その場の現在地を1回だけ取得する（キャッシュ不使用）。
// サーバー側(/api/stock-posts)が lat/lng で距離を検証するため、投稿時に付与する。
function getFreshPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  });
}

// ─── 型 ────────────────────────────────────────────────────────────────

interface GachaSuggestion { id?: string; label: string; type: 'gacha' | 'genre'; imageUrl?: string | null }

type Step = 'gacha' | 'spot' | 'stock' | 'confirm';

const STEPS: Step[] = ['gacha', 'spot', 'stock', 'confirm'];
const STEP_LABELS: Record<Step, string> = {
  gacha:   'ガチャを選ぶ',
  spot:    'お店を選ぶ',
  stock:   '在庫状況を選ぶ',
  confirm: '確認して投稿',
};

const STOCK_OPTIONS = [
  { value: 'in_stock',     label: '在庫あり ✅', color: '#22C55E' },
  { value: 'out_of_stock', label: '在庫なし ❌', color: '#EF4444' },
];

const ACCENT = '#60A5FA';

// ─── ステップヘッダー ──────────────────────────────────────────────────

function StepHeader({ step, onBack }: { step: Step; onBack?: () => void }) {
  const idx   = STEPS.indexOf(step);
  const total = STEPS.length;
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const stepTitleColor = isDark ? '#FFFFFF' : '#1A1A1A';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ChevronLeft size={22} color="#888" />
          </button>
        )}
        <span style={{ fontSize: 15, fontWeight: 700, color: stepTitleColor }}>{STEP_LABELS[step]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#AAA' }}>{idx + 1} / {total}</span>
      </div>
      <div style={{ height: 4, background: '#F0EDDF', borderRadius: 99 }}>
        <div style={{
          height: '100%', width: `${((idx + 1) / total) * 100}%`,
          background: ACCENT, borderRadius: 99, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

// ─── ガチャ検索 (共通) ────────────────────────────────────────────────

function GachaSearch({ onSelect, onClear, onResolvingChange, accentColor = ACCENT, largeText = false }: {
  accentColor?: string;
  largeText?: boolean;
  onSelect: (id: string, name: string, imageUrl: string | null) => void;
  onClear?: () => void;
  /** ガチャ解決中(true)を親へ通知。解決中は「次へ」を無効化するために使う。 */
  onResolvingChange?: (resolving: boolean) => void;
}) {
  const [value, setValue]             = useState('');
  const [suggestions, setSuggestions] = useState<GachaSuggestion[]>([]);
  const [focused, setFocused]         = useState(false);
  const [resolving, setResolving]     = useState(false);
  const [ipNames, setIpNames]         = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  // 人気IPはモバイル6件・デスクトップ12件（いいね総数が多い順）
  const shownIps = ipNames.slice(0, isMobile ? 6 : 12);

  useEffect(() => {
    fetch('/api/gacha/popular-ips')
      .then(r => r.json())
      .then(d => setIpNames(d.ipNames ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!focused || suggestions.length === 0) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (searchRef.current?.contains(e.target as Node)) return;
      setFocused(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [focused, suggestions.length]);

  const fetchSuggestions = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        setSuggestions((data.suggestions ?? []).filter((s: GachaSuggestion) => s.type === 'gacha'));
      } catch { /* silent */ }
    }, 150);
  };

  const handleSelect = async (label: string) => {
    // 解決中は「次へ」を無効化（gachaId は消さず、確定時に onSelect で確実に有効へ戻す）。
    setValue(label);
    setSuggestions([]);
    setResolving(true); onResolvingChange?.(true);
    try {
      const searchData = await fetch(`/api/gacha/search?q=${encodeURIComponent(label)}`).then(r => r.json());
      const id: string = searchData.gachaIds?.[0] ?? '';
      if (id) {
        const gachaData = await fetch(`/api/gacha/${id}`).then(r => r.json());
        const imageUrl: string | null = gachaData.gacha?.imageUrl ?? null;
        onSelect(id, label, imageUrl);
      }
    } catch { /* silent */ }
    setResolving(false); onResolvingChange?.(false);
  };

  const hasPopularIps = shownIps.length > 0;
  const dividerBleed = isMobile ? 12 : 0;

  return (
    // 人気IPタグの読み込み前後で「次へ」の位置が動かないよう、モバイルでは本文高さを予約する
    <div style={{ minHeight: isMobile ? POST_GACHA_BODY_HEIGHT : undefined }}>
      {/* 検索バー（home/search と同じUI） */}
      <div ref={searchRef} style={{ position: 'relative' }}>
        <div style={{ paddingTop: isMobile ? 6 : 8 }}>
          <div className="community-search-input-shell flex items-center gap-2 px-3 py-1.5 lg:py-2.5 rounded-full">
            {resolving ? (
              <div className="animate-spin rounded-full border-2 border-t-transparent flex-shrink-0" style={{ width: 15, height: 15, borderColor: accentColor, borderTopColor: 'transparent' }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            )}
            <input
              type="text"
              value={value}
              placeholder="気になっているガチャをさがす"
              onChange={e => { setValue(e.target.value); fetchSuggestions(e.target.value); }}
              onFocus={() => { setFocused(true); fetchSuggestions(value); }}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              disabled={resolving}
              className="community-search-input shell-field flex-1 bg-transparent text-xs lg:text-sm outline-none min-w-0"
              style={{ fontSize: isMobile ? 12 : (largeText ? 15 : 14), textAlign: 'left' }}
            />
            {value && !resolving && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setValue(''); setSuggestions([]); onClear?.(); }}
                aria-label="入力をクリア"
                className="home-search-clear-btn p-0 bg-transparent border-none cursor-pointer leading-none flex-shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {focused && suggestions.length > 0 && (
          <div
            className="search-suggest-dropdown absolute z-50 left-0 right-0 rounded-xl shadow-xl"
            style={{ top: 'calc(100% - 4px)', maxHeight: 280, overflow: 'hidden' }}
          >
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <div className="search-suggest-section" style={{ fontSize: isMobile ? 10 : 12 }}>ガチャ・IP</div>
              {suggestions.map((s) => (
                <button key={`${s.type}-${s.label}`} onMouseDown={e => { e.preventDefault(); handleSelect(s.label); }}
                  className="search-suggest-item flex items-center justify-between"
                  style={{ padding: isMobile ? '8px 12px' : '10px 14px' }}>
                  <span
                    className="search-suggest-label min-w-0 flex-1 truncate font-medium"
                    style={{ fontSize: isMobile ? 12 : (largeText ? 15 : 14), paddingRight: 8 }}
                  >
                    {s.label}
                  </span>
                  {s.type === 'genre' ? (
                    <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0, background: '#DBEAFE', color: '#1D4ED8' }}>IP</span>
                  ) : s.imageUrl ? (
                    // 任意ホスト画像のため img を使用
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt=""
                      style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasPopularIps && <SearchTagsDivider bleed={dividerBleed} />}

      <PopularIpTagList
        ips={shownIps}
        largeText={largeText}
        marginBottom={48}
        onIpClick={ip => { onClear?.(); setValue(ip); setFocused(true); fetchSuggestions(ip); }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── デスクトップ1ページレイアウト ────────────────────────────────────

type StockValidationErrors = { gacha?: string; spot?: string; stock?: string };

export function DesktopStockForm({ onDone, initialSpotId = '', initialSpotName = '', initialFilterGachaIds = [], initialSearch = '' }: {
  onDone?: () => void;
  initialSpotId?: string;
  initialSpotName?: string;
  initialFilterGachaIds?: string[];
  initialSearch?: string;
}) {
  const router = useRouter();

  const [gachaId,       setGachaId]      = useState('');
  const [gachaName,     setGachaName]    = useState('');
  const [gachaImageUrl, setGachaImageUrl] = useState<string | null>(null);
  const [spotId,        setSpotId]       = useState(initialSpotId);
  const [spotName,      setSpotName]     = useState(initialSpotName);
  const [stockStatus,   setStockStatus]  = useState('');
  const [submitting,    setSubmitting]   = useState(false);
  const [error,         setError]        = useState('');
  const [vErr,          setVErr]         = useState<StockValidationErrors>({});
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const sectionTitleColor = (errMsg?: string) => (errMsg ? '#EF4444' : isDark ? '#FFFFFF' : '#AAAAAA');
  const selectedGachaChipStyle: React.CSSProperties = isDark
    ? {
        background: 'rgba(96, 165, 250, 0.2)',
        border: `2px solid ${ACCENT}`,
        boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.45), 0 0 22px rgba(96, 165, 250, 0.32)',
      }
    : {
        background: '#DBEAFE',
        border: `2px solid ${ACCENT}`,
        boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.3), 0 0 16px rgba(96, 165, 250, 0.28)',
      };
  const selectedSpotChipStyle: React.CSSProperties = isDark
    ? { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid #262626' }
    : { background: 'rgba(255, 255, 255, 0.45)', border: '1px solid #e5e7eb' };

  const hasGacha = !!gachaId;

  const submit = async () => {
    const errs: StockValidationErrors = {};
    if (!gachaId)     errs.gacha = 'ガチャを選んでください';
    if (!spotId)      errs.spot  = 'お店を選んでください';
    if (!stockStatus) errs.stock = '在庫状況を選んでください';
    if (Object.keys(errs).length > 0) { setVErr(errs); return; }
    setVErr({});
    setSubmitting(true); setError('');
    try {
      const pos = await getFreshPosition();
      if (!pos) { setError('現在地を取得できませんでした。位置情報を許可して再度お試しください'); return; }
      const res = await fetch('/api/stock-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId, spotId, stockStatus, lat: pos.lat, lng: pos.lng }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '投稿に失敗しました'); }
      if (onDone) onDone();
      else router.push('/home?tab=community&posted=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const sec = (title: string, content: React.ReactNode, dim = false, errMsg?: string) => (
    <section style={{
      background: isDark ? '#0a0a0a' : 'white',
      borderRadius: 16,
      padding: '20px 24px',
      boxShadow: isDark ? 'none' : (errMsg ? '0 0 0 2px #EF444488' : '0 1px 6px rgba(0,0,0,0.05)'),
      border: isDark ? '1px solid #262626' : 'none',
      opacity: dim ? 0.4 : 1,
      pointerEvents: dim ? 'none' : 'auto',
      transition: 'opacity 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: sectionTitleColor(errMsg), textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </p>
        {errMsg && <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>⚠ {errMsg}</span>}
      </div>
      {content}
    </section>
  );

  return (
    <div style={{
      padding: '24px 32px', maxWidth: 1100, margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: 16,
      minHeight: '100%', background: isDark ? '#0a0a0a' : 'transparent',
    }}>

      {sec('ガチャを選ぶ',
        hasGacha ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
            ...selectedGachaChipStyle,
          }}>
            {gachaImageUrl && (
              <img src={gachaImageUrl} alt={gachaName}
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A', flex: 1 }}>{gachaName}</span>
            <button onClick={() => { setGachaId(''); setGachaName(''); setGachaImageUrl(null); if (!initialSpotId) { setSpotId(''); setSpotName(''); } setVErr(v => ({ ...v, gacha: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={15} color="#bbb" />
            </button>
          </div>
        ) : initialSpotId ? (
          <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds} initialQuery={initialSearch} largeText
            onSelect={(id, name, imgUrl) => {
              setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
              setVErr(v => ({ ...v, gacha: undefined }));
            }} />
        ) : (
          <GachaSearch
            accentColor={ACCENT}
            largeText
            onSelect={(id, name, imgUrl) => {
              setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
              setVErr(v => ({ ...v, gacha: undefined }));
            }}
            onClear={() => {
              setGachaId(''); setGachaName(''); setGachaImageUrl(null);
              setVErr(v => ({ ...v, gacha: undefined }));
            }}
          />
        ),
        false, vErr.gacha
      )}

      {sec('お店を選ぶ',
        spotId ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
            ...selectedSpotChipStyle,
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A', flex: 1 }}>{spotName}</span>
            <button onClick={() => { setSpotId(''); setSpotName(''); setVErr(v => ({ ...v, spot: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={15} color="#bbb" />
            </button>
          </div>
        ) : hasGacha ? (
          <StockSpotPanel
            gachaId={gachaId} gachaName={gachaName} gachaImageUrl={gachaImageUrl} largeText
            onSelect={(id, name) => { setSpotId(id); setSpotName(name); setVErr(v => ({ ...v, spot: undefined })); }}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 15, color: isDark ? '#737373' : '#CCC' }}>先にガチャを選んでください</p>
        ),
        !hasGacha, vErr.spot
      )}

      {sec('在庫状況',
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {STOCK_OPTIONS.map(opt => (
            <button key={opt.value}
              onClick={() => { setStockStatus(opt.value); setVErr(v => ({ ...v, stock: undefined })); }}
              style={{
                padding: '14px 18px', borderRadius: 12, border: '2px solid',
                borderColor: stockStatus === opt.value ? opt.color : (isDark ? '#262626' : '#EDE9D8'),
                background: stockStatus === opt.value ? opt.color + '18' : (isDark ? '#0a0a0a' : '#FAFAF6'),
                fontSize: 16, fontWeight: 700,
                color: stockStatus === opt.value ? opt.color : (isDark ? '#d4d4d4' : '#555'),
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              }}>
              {opt.label}
            </button>
          ))}
        </div>,
        !spotId, vErr.stock
      )}

      {error && <p style={{ color: '#E53E3E', fontSize: 15, margin: 0 }}>{error}</p>}

      <button onClick={submit} disabled={submitting || !spotId}
        style={{
          padding: '16px 0', borderRadius: 14, border: 'none',
          background: submitting || !spotId ? '#ccc' : ACCENT,
          color: 'white', fontSize: 18, fontWeight: 800,
          cursor: submitting || !spotId ? 'not-allowed' : 'pointer',
          opacity: !spotId ? 0.45 : 1,
          transition: 'all 0.2s',
        }}>
        {submitting ? '投稿中…' : '在庫情報を投稿する'}
      </button>
    </div>
  );
}

// ─── スタイルヘルパー ────────────────────────────────────────────────────

const nextBtnStyle = (active: boolean, isDark: boolean): React.CSSProperties => ({
  padding: '12px 0', borderRadius: 12, border: 'none',
  background: active ? ACCENT : isDark ? '#141414' : '#F0EDDF',
  color: active ? 'white' : isDark ? '#525252' : '#CCC',
  fontSize: 14, fontWeight: 800, cursor: active ? 'pointer' : 'not-allowed',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
});

// ─── モバイル ステップフォーム ─────────────────────────────────────────

export function StockPostForm({ onDone, initialSpotId = '', initialSpotName = '', initialFilterGachaIds = [], initialSearch = '' }: {
  onDone?: () => void;
  initialSpotId?: string;
  initialSpotName?: string;
  initialFilterGachaIds?: string[];
  initialSearch?: string;
}) {
  const router = useRouter();

  const [step,          setStep]         = useState<Step>('gacha');
  const [gachaId,       setGachaId]      = useState('');
  const [gachaName,     setGachaName]    = useState('');
  const [gachaImageUrl, setGachaImageUrl] = useState<string | null>(null);
  const [gachaResolving, setGachaResolving] = useState(false);
  const [spotId,        setSpotId]       = useState(initialSpotId);
  const [spotName,      setSpotName]     = useState(initialSpotName);
  const [stockStatus,   setStockStatus]  = useState('');
  const [submitting,    setSubmitting]   = useState(false);
  const [error,         setError]        = useState('');
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx <= 0) return;
    const prev = STEPS[idx - 1];
    if (prev === 'spot' && spotId) setStep(STEPS[idx - 2] ?? STEPS[0]);
    else setStep(prev);
  };
  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx >= STEPS.length - 1) return;
    const next = STEPS[idx + 1];
    if (next === 'spot' && spotId) setStep(STEPS[idx + 2] ?? STEPS[STEPS.length - 1]);
    else setStep(next);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const pos = await getFreshPosition();
      if (!pos) { setError('現在地を取得できませんでした。位置情報を許可して再度お試しください'); return; }
      const res = await fetch('/api/stock-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId, spotId, stockStatus, lat: pos.lat, lng: pos.lng }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '投稿に失敗しました'); }
      if (onDone) onDone();
      else router.push('/home?tab=community&posted=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const card = (content: React.ReactNode) => (
    <div style={{
      background: isDark ? '#0a0a0a' : 'white',
      borderRadius: 20,
      padding: '16px 12px',
      boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
      border: isDark ? '1px solid #262626' : 'none',
    }}>
      {content}
    </div>
  );

  return (
    <div style={{
      padding: '12px 10px', maxWidth: 480, margin: '0 auto',
      minHeight: '100%', background: isDark ? '#0a0a0a' : 'transparent',
    }}>

      {step === 'gacha' && card(
        <>
          <StepHeader step="gacha" />
          {initialSpotId ? (
            <>
              <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds} initialQuery={initialSearch}
                selectedId={gachaId}
                onSelect={(id, name, imgUrl) => {
                  setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
                }} />
              <button onClick={goNext} disabled={!gachaId}
                style={{ ...nextBtnStyle(!!gachaId, isDark), marginTop: 32, width: '100%' }}>
                次へ <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <GachaSearch
                onSelect={(id, name, imgUrl) => {
                  setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
                }}
                onClear={() => { setGachaId(''); setGachaName(''); setGachaImageUrl(null); }}
                onResolvingChange={setGachaResolving}
              />
              <button onClick={goNext} disabled={!gachaId || gachaResolving}
                style={{ ...nextBtnStyle(!!gachaId && !gachaResolving, isDark), width: '100%' }}>
                次へ <ChevronRight size={14} />
              </button>
            </>
          )}
        </>
      )}

      {step === 'spot' && card(
        <>
          <StepHeader step="spot" onBack={goBack} />
          {spotId ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: isDark ? '#0a0a0a' : '#EFF6FF', borderRadius: 12, marginBottom: 4,
              border: isDark ? '1px solid #262626' : 'none',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A', flex: 1 }}>{spotName}</span>
              <button onClick={() => { setSpotId(''); setSpotName(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#3B82F6', fontWeight: 700 }}>
                変更
              </button>
            </div>
          ) : (
            <StockSpotPanel
              gachaId={gachaId} gachaName={gachaName} gachaImageUrl={gachaImageUrl}
              onSelect={(id, name) => { setSpotId(id); setSpotName(name); }}
            />
          )}
          <button onClick={goNext} disabled={!spotId}
            style={{ ...nextBtnStyle(!!spotId, isDark), marginTop: 16, width: '100%' }}>
            次へ <ChevronRight size={14} />
          </button>
        </>
      )}

      {step === 'stock' && card(
        <>
          <StepHeader step="stock" onBack={goBack} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STOCK_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setStockStatus(opt.value)}
                style={{
                  padding: '14px 20px', borderRadius: 14, border: '2px solid',
                  borderColor: stockStatus === opt.value ? opt.color : (isDark ? '#262626' : '#EDE9D8'),
                  background: stockStatus === opt.value ? opt.color + '18' : (isDark ? '#0a0a0a' : 'white'),
                  fontSize: 15, fontWeight: 700, color: stockStatus === opt.value ? opt.color : (isDark ? '#d4d4d4' : '#555'),
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={goNext} disabled={!stockStatus}
            style={{ ...nextBtnStyle(!!stockStatus, isDark), marginTop: 16, width: '100%' }}>
            次へ <ChevronRight size={14} />
          </button>
        </>
      )}

      {step === 'confirm' && card(
        <>
          <StepHeader step="confirm" onBack={goBack} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {([
              ['ガチャ',   gachaName],
              ['お店',     spotName],
              ['在庫状況', STOCK_OPTIONS.find(o => o.value === stockStatus)?.label ?? stockStatus],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', gap: 10, padding: '10px 14px',
                background: isDark ? '#0a0a0a' : '#FAFAF6', borderRadius: 10,
              }}>
                <span style={{ fontSize: 12, color: isDark ? '#737373' : '#AAA', minWidth: 56 }}>{label}</span>
                <span style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#222', fontWeight: 600, flex: 1 }}>{val}</span>
              </div>
            ))}
          </div>
          {error && <p style={{ color: '#E53E3E', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button onClick={submit} disabled={submitting}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
              background: submitting ? '#ccc' : ACCENT, color: 'white',
              fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
            {submitting ? '投稿中…' : '在庫情報を投稿する'}
          </button>
        </>
      )}
    </div>
  );
}
