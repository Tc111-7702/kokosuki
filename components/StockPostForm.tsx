'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { StockSpotPanel } from '@/components/StockSpotPanel';
import { SpotGachaPicker } from '@/components/SpotGachaPicker';
import { useIsMobile } from '@/lib/useIsMobile';

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
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ChevronLeft size={22} color="#888" />
          </button>
        )}
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{STEP_LABELS[step]}</span>
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

function GachaSearch({ onSelect, accentColor = ACCENT }: {
  accentColor?: string;
  onSelect: (id: string, name: string, imageUrl: string | null) => void;
}) {
  const [value, setValue]             = useState('');
  const [suggestions, setSuggestions] = useState<GachaSuggestion[]>([]);
  const [focused, setFocused]         = useState(false);
  const [resolving, setResolving]     = useState(false);
  const [ipNames, setIpNames]         = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();
  // 人気IPはモバイル6件・デスクトップ12件（いいね総数が多い順）
  const shownIps = ipNames.slice(0, isMobile ? 6 : 12);

  useEffect(() => {
    fetch('/api/gacha/popular-ips')
      .then(r => r.json())
      .then(d => setIpNames(d.ipNames ?? []))
      .catch(() => {});
  }, []);

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
    setValue(label);
    setSuggestions([]);
    setResolving(true);
    try {
      const searchData = await fetch(`/api/gacha/search?q=${encodeURIComponent(label)}`).then(r => r.json());
      const id: string = searchData.gachaIds?.[0] ?? '';
      if (id) {
        const gachaData = await fetch(`/api/gacha/${id}`).then(r => r.json());
        const imageUrl: string | null = gachaData.gacha?.imageUrl ?? null;
        onSelect(id, label, imageUrl);
      }
    } catch { /* silent */ }
    setResolving(false);
  };

  return (
    <div>
      {/* 検索バー（人気IPの上に配置） */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: '#F5F3ED', borderRadius: 12,
          border: focused ? `1.5px solid ${accentColor}` : '1.5px solid transparent',
          transition: 'border-color 0.15s',
        }}>
          <Search size={14} color="#aaa" />
          <input
            type="text" value={value} placeholder="ガチャ名で検索…"
            onChange={e => { setValue(e.target.value); fetchSuggestions(e.target.value); }}
            onFocus={() => { setFocused(true); fetchSuggestions(value); }}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#333' }}
          />
          {resolving ? (
            <div style={{ width: 13, height: 13, border: `2px solid ${accentColor}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : value ? (
            <button onMouseDown={e => { e.preventDefault(); setValue(''); setSuggestions([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={13} color="#bbb" />
            </button>
          ) : null}
        </div>

        {focused && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            border: '1px solid #f0f0f0', maxHeight: 260, overflowY: 'auto',
          }}>
            {suggestions.map((s, i) => (
              <button key={s.label} onMouseDown={e => { e.preventDefault(); handleSelect(s.label); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: isMobile ? '8px 12px' : '10px 14px', border: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
                  background: 'none', cursor: 'pointer',
                }}>
                {s.type === 'gacha' && s.imageUrl ? (
                  // 任意ホスト画像のため img を使用
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt=""
                    style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#F0ECD8' }}
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                ) : (
                  <span style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, background: '#F0ECD8', flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: isMobile ? 12.5 : 14, color: '#222' }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 人気のIP（いいね総数が多い順 / モバイル6・デスクトップ12） */}
      {shownIps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#AAA', marginRight: 2 }}>人気のIP</span>
          {shownIps.map(ip => (
            <button key={ip} onMouseDown={e => { e.preventDefault(); setValue(ip); setFocused(true); fetchSuggestions(ip); }}
              style={{
                padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${accentColor}44`,
                background: `${accentColor}11`, fontSize: 12, color: '#555',
                cursor: 'pointer', fontWeight: 600,
              }}>
              {ip}
            </button>
          ))}
        </div>
      )}
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
      const res = await fetch('/api/stock-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId, spotId, stockStatus }),
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
      background: 'white', borderRadius: 16, padding: '20px 24px',
      boxShadow: errMsg ? '0 0 0 2px #EF444488' : '0 1px 6px rgba(0,0,0,0.05)',
      opacity: dim ? 0.4 : 1,
      pointerEvents: dim ? 'none' : 'auto',
      transition: 'opacity 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: errMsg ? '#EF4444' : '#AAA', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </p>
        {errMsg && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>⚠ {errMsg}</span>}
      </div>
      {content}
    </section>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {sec('ガチャを選ぶ *',
        hasGacha ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {gachaImageUrl && (
              <img src={gachaImageUrl} alt={gachaName}
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', flex: 1 }}>{gachaName}</span>
            <button onClick={() => { setGachaId(''); setGachaName(''); setGachaImageUrl(null); if (!initialSpotId) { setSpotId(''); setSpotName(''); } setVErr(v => ({ ...v, gacha: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={15} color="#bbb" />
            </button>
          </div>
        ) : initialSpotId ? (
          <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds} initialQuery={initialSearch}
            onSelect={(id, name, imgUrl) => {
              setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
              setVErr(v => ({ ...v, gacha: undefined }));
            }} />
        ) : (
          <GachaSearch accentColor={ACCENT} onSelect={(id, name, imgUrl) => {
            setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
            setVErr(v => ({ ...v, gacha: undefined }));
          }} />
        ),
        false, vErr.gacha
      )}

      {sec('お店を選ぶ *',
        spotId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', flex: 1 }}>🏪 {spotName}</span>
            <button onClick={() => { setSpotId(''); setSpotName(''); setVErr(v => ({ ...v, spot: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={15} color="#bbb" />
            </button>
          </div>
        ) : hasGacha ? (
          <StockSpotPanel
            gachaId={gachaId} gachaName={gachaName} gachaImageUrl={gachaImageUrl}
            onSelect={(id, name) => { setSpotId(id); setSpotName(name); setVErr(v => ({ ...v, spot: undefined })); }}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: '#CCC' }}>先にガチャを選んでください</p>
        ),
        !hasGacha, vErr.spot
      )}

      {sec('在庫状況 *',
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {STOCK_OPTIONS.map(opt => (
            <button key={opt.value}
              onClick={() => { setStockStatus(opt.value); setVErr(v => ({ ...v, stock: undefined })); }}
              style={{
                padding: '12px 16px', borderRadius: 12, border: '2px solid',
                borderColor: stockStatus === opt.value ? opt.color : '#EDE9D8',
                background: stockStatus === opt.value ? opt.color + '18' : '#FAFAF6',
                fontSize: 14, fontWeight: 700,
                color: stockStatus === opt.value ? opt.color : '#555',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              }}>
              {opt.label}
            </button>
          ))}
        </div>,
        !spotId, vErr.stock
      )}

      {error && <p style={{ color: '#E53E3E', fontSize: 13, margin: 0 }}>{error}</p>}

      <button onClick={submit} disabled={submitting || !spotId}
        style={{
          padding: '15px 0', borderRadius: 14, border: 'none',
          background: submitting || !spotId ? '#ccc' : ACCENT,
          color: 'white', fontSize: 16, fontWeight: 800,
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

const nextBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '12px 0', borderRadius: 12, border: 'none',
  background: active ? ACCENT : '#F0EDDF', color: active ? 'white' : '#CCC',
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
  const [spotId,        setSpotId]       = useState(initialSpotId);
  const [spotName,      setSpotName]     = useState(initialSpotName);
  const [stockStatus,   setStockStatus]  = useState('');
  const [submitting,    setSubmitting]   = useState(false);
  const [error,         setError]        = useState('');

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
      const res = await fetch('/api/stock-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId, spotId, stockStatus }),
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
    <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {content}
    </div>
  );

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

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
                style={{ ...nextBtnStyle(!!gachaId), marginTop: 16, width: '100%' }}>
                次へ <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <GachaSearch onSelect={(id, name, imgUrl) => {
                setGachaId(id); setGachaName(name); setGachaImageUrl(imgUrl);
              }} />
              <button onClick={goNext} disabled={!gachaId}
                style={{ ...nextBtnStyle(!!gachaId), marginTop: 16, width: '100%' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#EFF6FF', borderRadius: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', flex: 1 }}>🏪 {spotName}</span>
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
            style={{ ...nextBtnStyle(!!spotId), marginTop: 16, width: '100%' }}>
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
                  borderColor: stockStatus === opt.value ? opt.color : '#EDE9D8',
                  background: stockStatus === opt.value ? opt.color + '18' : 'white',
                  fontSize: 15, fontWeight: 700, color: stockStatus === opt.value ? opt.color : '#555',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={goNext} disabled={!stockStatus}
            style={{ ...nextBtnStyle(!!stockStatus), marginTop: 16, width: '100%' }}>
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
              <div key={label} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#FAFAF6', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#AAA', minWidth: 56 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#222', fontWeight: 600, flex: 1 }}>{val}</span>
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
