'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft, ChevronRight, Camera, SlidersHorizontal } from 'lucide-react';
import { SpotSearchPanel } from '@/components/SpotSearchPanel';
import { useIsMobile } from '@/lib/useIsMobile';
import FilterDrawer from '@/components/FilterDrawer';

// ─── 型 ─────────────────────────────────────────────────────────────────

interface GachaSuggestion { label: string; type: 'gacha' | 'genre' }

type Step = 'gacha' | 'spot' | 'result' | 'item' | 'photo' | 'memo' | 'confirm';
const STEPS: Step[] = ['gacha', 'spot', 'result', 'item', 'photo', 'memo', 'confirm'];
const STEP_LABELS: Record<Step, string> = {
  gacha:   'ガチャを選ぶ',
  spot:    'お店を選ぶ',
  result:  '結果を選ぶ',
  item:    'アイテムを選ぶ',
  photo:   '写真（任意）',
  memo:    'メモ（任意）',
  confirm: '確認して投稿',
};

const RESULT_OPTIONS = [
  { value: '神引き', label: '● 神引き',
    cls:    'border border-yellow-400 text-yellow-600 bg-yellow-50',
    selCls: 'border-2 border-yellow-500 text-yellow-700 bg-yellow-100 font-bold ring-2 ring-yellow-200' },
  { value: '爆死', label: '● 爆死',
    cls:    'border border-red-300 text-red-500 bg-red-100',
    selCls: 'border-2 border-red-400 text-red-600 bg-red-200 font-bold ring-2 ring-red-100' },
  { value: 'ダブり', label: '● ダブり',
    cls:    'border border-blue-200 text-blue-400 bg-blue-50',
    selCls: 'border-2 border-blue-400 text-blue-500 bg-blue-100 font-bold ring-2 ring-blue-100' },
];

// ─── 共有フォーム状態 ────────────────────────────────────────────────────

interface FormState {
  gachaId: string; gachaName: string; gachaImageUrl: string | null; gachaLineup: string[];
  spotId: string; spotName: string;
  result: string; itemName: string; imageUrl: string; memo: string;
}
const EMPTY: FormState = {
  gachaId: '', gachaName: '', gachaImageUrl: null, gachaLineup: [],
  spotId: '', spotName: '', result: '', itemName: '', imageUrl: '', memo: '',
};

// ─── ガチャ検索（人気IP chips 付き） ─────────────────────────────────────

function GachaSearch({ onSelect }: {
  onSelect: (id: string, name: string, imageUrl: string | null, lineup: string[]) => void;
}) {
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState<GachaSuggestion[]>([]);
  const [focused, setFocused]         = useState(false);
  const [resolving, setResolving]     = useState(false);
  const [ipNames, setIpNames]         = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/gacha/filters').then(r => r.json())
      .then(d => setIpNames((d.ipNames ?? []).slice(0, 12)))
      .catch(() => {});
  }, []);

  const fetchSuggestions = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const d = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        setSuggestions((d.suggestions ?? []).filter((s: GachaSuggestion) => s.type === 'gacha'));
      } catch { /* silent */ }
    }, 150);
  };

  const handleSelect = async (label: string) => {
    setQuery(label); setSuggestions([]); setResolving(true);
    try {
      const searchData = await fetch(`/api/gacha/search?q=${encodeURIComponent(label)}`).then(r => r.json());
      const id: string = searchData.gachaIds?.[0] ?? '';
      if (id) {
        const gd = await fetch(`/api/gacha/${id}`).then(r => r.json());
        onSelect(id, label, gd.gacha?.imageUrl ?? null, gd.gacha?.lineup ?? []);
      }
    } catch { /* silent */ }
    setResolving(false);
  };

  return (
    <div>
      {ipNames.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: '#AAA', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>人気のIP</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {ipNames.map(ip => (
              <button key={ip}
                onMouseDown={e => { e.preventDefault(); setQuery(ip); setFocused(true); fetchSuggestions(ip); }}
                style={{
                  padding: '5px 13px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                  border: '1.5px solid #EDE9D8',
                  background: query === ip ? '#F2B800' : 'white',
                  color: query === ip ? '#1A1A1A' : '#555',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {ip}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: '#F5F3ED', borderRadius: 12,
          border: focused ? '1.5px solid #F2B800' : '1.5px solid transparent',
          transition: 'border-color 0.15s',
        }}>
          <Search size={14} color="#aaa" />
          <input type="text" value={query} placeholder="ガチャ名で検索…"
            onChange={e => { setQuery(e.target.value); fetchSuggestions(e.target.value); }}
            onFocus={() => { setFocused(true); if (query) fetchSuggestions(query); }}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#333' }} />
          {resolving
            ? <div style={{ width: 13, height: 13, border: '2px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : query
              ? <button onMouseDown={e => { e.preventDefault(); setQuery(''); setSuggestions([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={13} color="#bbb" />
                </button>
              : null}
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
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
                  background: 'none', cursor: 'pointer', fontSize: 14, color: '#222',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}


// ─── 店舗ガチャピッカー（店舗から投稿時に使用） ────────────────────────────

type GachaItem = { id: string; seriesName: string; ipName: string; imageUrl: string | null };

function SpotGachaPicker({ spotId, filterGachaIds, onSelect, selectedId }: {
  spotId: string;
  filterGachaIds: string[];
  onSelect: (id: string, name: string, imageUrl: string | null, lineup: string[]) => void;
  selectedId?: string;
}) {
  const isMobile = useIsMobile();
  const [allGachas,       setAllGachas]       = useState<GachaItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [resolving,       setResolving]       = useState<string | null>(null);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>(filterGachaIds);
  const [filterOpen,      setFilterOpen]      = useState(false);

  const isFiltered = activeFilterIds.length > 0;
  const filterSet  = new Set(activeFilterIds);
  const gachas     = isFiltered ? allGachas.filter(g => filterSet.has(g.id)) : allGachas;

  useEffect(() => {
    Promise.all([
      fetch(`/api/spots/${spotId}`).then(r => r.json()),
      fetch('/api/gacha/filters').then(r => r.json()),
    ]).then(([spotRes, filterRes]) => {
      const gachaIdSet = new Set<string>(spotRes.spot?.gachaIds ?? []);
      setAllGachas(
        (filterRes.items ?? []).filter((g: GachaItem) => gachaIdSet.has(g.id))
      );
    }).catch(() => {}).finally(() => setLoading(false));
  }, [spotId]);

  const handleSelect = async (g: GachaItem) => {
    setResolving(g.id);
    try {
      const d = await fetch(`/api/gacha/${g.id}`).then(r => r.json());
      onSelect(g.id, g.seriesName, g.imageUrl, d.gacha?.lineup ?? []);
    } catch {
      onSelect(g.id, g.seriesName, g.imageUrl, []);
    }
    setResolving(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  return (
    <div>
      {/* フィルターバー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setFilterOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            background: isFiltered ? '#F2B800' : '#F5F3ED',
            color: isFiltered ? 'white' : '#888',
            fontSize: 13, fontWeight: 700,
          }}>
          <SlidersHorizontal size={13} />
          {isFiltered ? `フィルター中 (${activeFilterIds.length})` : 'フィルター'}
        </button>
        {isFiltered && (
          <button onClick={() => setActiveFilterIds([])}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: '#FFF0C0', color: '#B8860B', fontWeight: 700 }}>
            解除
          </button>
        )}
        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{gachas.length}件</span>
      </div>

      {/* ガチャリスト（ピルボタン） */}
      {gachas.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          フィルター条件に合う商品がありません
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 240, overflowY: 'auto' }}>
          {gachas.map(g => (
            <button key={g.id} onClick={() => handleSelect(g)} disabled={!!resolving}
              style={{
                padding: isMobile ? '6px 8px' : '6px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: (selectedId === g.id || resolving === g.id) ? '2px solid #F2B800' : '1.5px solid #EDE9D8',
                background: (selectedId === g.id || resolving === g.id) ? '#FFF8D0' : 'white',
                color: (selectedId === g.id || resolving === g.id) ? '#8A6800' : '#555',
                cursor: resolving ? 'wait' : 'pointer', transition: 'all 0.12s',
                opacity: resolving && resolving !== g.id ? 0.45 : 1,
              }}>
              {resolving === g.id
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, border: '2px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    {g.seriesName}
                  </span>
                : g.seriesName}
            </button>
          ))}
        </div>
      )}

      {filterOpen && (
        <FilterDrawer
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={ids => { setActiveFilterIds(ids); setFilterOpen(false); }}
          favoriteIps={[]}
          currentGachaIds={activeFilterIds}
        />
      )}
    </div>
  );
}

// ─── 結果選択 ────────────────────────────────────────────────────────────

function ResultSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {RESULT_OPTIONS.map(opt => {
        const isSelected = value === opt.value;
        const isDimmed   = !!value && !isSelected;
        return (
          <button key={opt.value}
            onClick={() => onChange(isSelected ? '' : opt.value)}
            className={`px-5 py-2 rounded-full text-sm cursor-pointer transition-all ${isSelected ? opt.selCls : opt.cls}`}
            style={{ opacity: isDimmed ? 0.3 : 1 }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── アイテム選択 ─────────────────────────────────────────────────────────

function ItemSelector({ items, value, onChange }: {
  items: string[]; value: string; onChange: (v: string) => void;
}) {
  if (items.length === 0) {
    return (
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="アイテム名を入力"
        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14,
                 border: '1.5px solid #EDE9D8', outline: 'none', color: '#333', boxSizing: 'border-box' }} />
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 180, overflowY: 'auto' }}>
      {items.map(item => (
        <button key={item} onClick={() => onChange(item === value ? '' : item)}
          style={{
            padding: '6px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: value === item ? '2px solid #F2B800' : '1.5px solid #EDE9D8',
            background: value === item ? '#FFF8D0' : 'white',
            color: value === item ? '#8A6800' : '#555',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
          {item}
        </button>
      ))}
    </div>
  );
}

// ─── ステップヘッダー（モバイル用） ─────────────────────────────────────

function StepHeader({ step, onBack }: { step: Step; onBack?: () => void }) {
  const idx = STEPS.indexOf(step);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ChevronLeft size={22} color="#888" />
          </button>
        )}
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{STEP_LABELS[step]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#AAA' }}>{idx + 1} / {STEPS.length}</span>
      </div>
      <div style={{ height: 4, background: '#F0EDDF', borderRadius: 99 }}>
        <div style={{
          height: '100%', width: `${((idx + 1) / STEPS.length) * 100}%`,
          background: '#F2B800', borderRadius: 99, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

// ─── モバイル：ステップ形式 ───────────────────────────────────────────────

function MobileForm({ onDone, initialSpotId = '', initialSpotName = '', initialFilterGachaIds = [] }: {
  onDone?: () => void;
  initialSpotId?: string;
  initialSpotName?: string;
  initialFilterGachaIds?: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('gacha');
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    spotId: initialSpotId,
    spotName: initialSpotName,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const set    = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }));
  const goBack = () => {
    const i = STEPS.indexOf(step);
    if (i <= 0) return;
    const prev = STEPS[i - 1];
    // スポットが事前入力済みの場合は 'spot' ステップをスキップ
    if (prev === 'spot' && form.spotId) setStep(STEPS[i - 2] ?? STEPS[0]);
    else setStep(prev);
  };
  const goNext = () => {
    const i = STEPS.indexOf(step);
    if (i >= STEPS.length - 1) return;
    const next = STEPS[i + 1];
    // スポットが事前入力済みの場合は 'spot' ステップをスキップ
    if (next === 'spot' && form.spotId) setStep(STEPS[i + 2] ?? STEPS[STEPS.length - 1]);
    else setStep(next);
  };

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId: form.gachaId, spotId: form.spotId, result: form.result, itemName: form.itemName, imageUrl: form.imageUrl || undefined, memo: form.memo || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '投稿に失敗しました'); }
      if (onDone) onDone(); else router.push('/home?tab=community');
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally { setSubmitting(false); }
  };

  const card = (content: React.ReactNode) => (
    <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {content}
    </div>
  );

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

      {step === 'gacha' && card(<>
        <StepHeader step="gacha" />
        {initialSpotId ? (
          <>
            <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds}
              selectedId={form.gachaId}
              onSelect={(id, name, img, lineup) => {
                set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
              }} />
            <button onClick={goNext} disabled={!form.gachaId}
              style={{ ...nextBtnStyle(!!form.gachaId), marginTop: 16, width: '100%' }}>
              次へ <ChevronRight size={14} />
            </button>
          </>
        ) : (
          <>
            <GachaSearch onSelect={(id, name, img, lineup) => {
              set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
            }} />
            <button onClick={goNext} disabled={!form.gachaId}
              style={{ ...nextBtnStyle(!!form.gachaId), marginTop: 16, width: '100%' }}>
              次へ <ChevronRight size={14} />
            </button>
          </>
        )}
      </>)}

      {step === 'spot' && card(<>
        <StepHeader step="spot" onBack={goBack} />
        {form.spotId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#FFFBE6', borderRadius: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', flex: 1 }}>🏪 {form.spotName}</span>
            <button onClick={() => set({ spotId: '', spotName: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#F2B800', fontWeight: 700 }}>
              変更
            </button>
          </div>
        ) : (
          <SpotSearchPanel
            gachaId={form.gachaId} gachaName={form.gachaName} gachaImageUrl={form.gachaImageUrl}
            accentColor="#F2B800"
            onSelect={(id, name) => { set({ spotId: id, spotName: name }); }} />
        )}
        <button onClick={goNext} disabled={!form.spotId}
          style={{ ...nextBtnStyle(!!form.spotId), marginTop: 16, width: '100%' }}>
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'result' && card(<>
        <StepHeader step="result" onBack={goBack} />
        <ResultSelector value={form.result} onChange={v => set({ result: v })} />
        <button onClick={goNext} disabled={!form.result}
          style={{ ...nextBtnStyle(!!form.result), marginTop: 16, width: '100%' }}>
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'item' && card(<>
        <StepHeader step="item" onBack={goBack} />
        <ItemSelector items={form.gachaLineup} value={form.itemName} onChange={v => set({ itemName: v })} />
        <button onClick={goNext} disabled={!form.itemName}
          style={{ ...nextBtnStyle(!!form.itemName), marginTop: 16, width: '100%' }}>
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'photo' && card(<>
        <StepHeader step="photo" onBack={goBack} />
        <ImageUploader value={form.imageUrl} onChange={url => set({ imageUrl: url })} accentColor="#F2B800" />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={goNext} style={skipBtnStyle}>スキップ</button>
          <button onClick={goNext} style={nextBtnStyle(true)}>次へ <ChevronRight size={14} /></button>
        </div>
      </>)}

      {step === 'memo' && card(<>
        <StepHeader step="memo" onBack={goBack} />
        <textarea value={form.memo} onChange={e => set({ memo: e.target.value })}
          placeholder="ひとことメモ…" rows={4}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                   border: '1.5px solid #EDE9D8', outline: 'none', resize: 'none', color: '#333', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={goNext} style={skipBtnStyle}>スキップ</button>
          <button onClick={goNext} style={nextBtnStyle(true)}>確認へ <ChevronRight size={14} /></button>
        </div>
      </>)}

      {step === 'confirm' && card(<>
        <StepHeader step="confirm" onBack={goBack} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {([
            ['ガチャ',   form.gachaName],
            ['お店',     form.spotName],
            ['結果',     RESULT_OPTIONS.find(o => o.value === form.result)?.label ?? form.result],
            ['アイテム', form.itemName],
            ...(form.memo ? [['メモ', form.memo]] : []),
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#FAFAF6', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: '#AAA', minWidth: 56 }}>{lbl}</span>
              <span style={{ fontSize: 13, color: '#222', fontWeight: 600, flex: 1 }}>{val}</span>
            </div>
          ))}
        </div>
        {error && <p style={{ color: '#E53E3E', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button onClick={submit} disabled={submitting}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                   background: submitting ? '#ccc' : '#F2B800', color: 'white',
                   fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {submitting ? '投稿中…' : '投稿する'}
        </button>
      </>)}
    </div>
  );
}

// ─── 画像アップロード共通コンポーネント ─────────────────────────────────

function ImageUploader({ value, onChange, accentColor = '#F2B800' }: {
  value: string;
  onChange: (url: string) => void;
  accentColor?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d   = await res.json();
      if (d.url) onChange(d.url);
    } catch { /* silent */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
        style={{ display: 'none' }} />
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="preview"
            style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 10, objectFit: 'cover', display: 'block' }} />
          <button onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
              width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <X size={12} color="white" />
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            background: '#F5F3ED', borderRadius: 12, border: `1.5px dashed #DDD`,
            cursor: 'pointer', fontSize: 13, color: '#888', fontWeight: 600,
          }}>
          <Camera size={15} color={accentColor} />
          {uploading ? 'アップロード中…' : 'デバイスから画像を追加'}
        </button>
      )}
    </div>
  );
}

// ─── デスクトップ：1ページ完結 ───────────────────────────────────────────

type ValidationErrors = { gacha?: string; result?: string; item?: string; spot?: string };

export function DesktopNormalForm({ onDone, initialSpotId = '', initialSpotName = '', initialFilterGachaIds = [] }: {
  onDone?: () => void;
  initialSpotId?: string;
  initialSpotName?: string;
  initialFilterGachaIds?: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    spotId: initialSpotId,
    spotName: initialSpotName,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [vErr, setVErr]             = useState<ValidationErrors>({});
  const set = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }));

  const hasGacha = !!form.gachaId;

  const submit = async () => {
    // バリデーション
    const errs: ValidationErrors = {};
    if (!form.gachaId)   errs.gacha  = 'ガチャを選んでください';
    if (!form.result)    errs.result = '結果を選んでください';
    if (!form.itemName)  errs.item   = 'アイテムを選んでください';
    if (!form.spotId)    errs.spot   = 'お店を選んでください';
    if (Object.keys(errs).length > 0) { setVErr(errs); return; }
    setVErr({});
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gachaId: form.gachaId, spotId: form.spotId, result: form.result, itemName: form.itemName, imageUrl: form.imageUrl || undefined, memo: form.memo || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '投稿に失敗しました'); }
      if (onDone) onDone(); else router.push('/home?tab=community');
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally { setSubmitting(false); }
  };

  const sec = (title: string, content: React.ReactNode, dim = false, errMsg?: string) => (
    <section style={{
      background: 'white', borderRadius: 16, padding: '20px 24px',
      boxShadow: errMsg ? '0 0 0 2px #EF444488' : '0 1px 8px rgba(0,0,0,0.05)',
      opacity: dim ? 0.4 : 1, pointerEvents: dim ? 'none' : 'auto',
      transition: 'opacity 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: errMsg ? '#EF4444' : '#AAA', letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</p>
        {errMsg && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>⚠ {errMsg}</span>}
      </div>
      {content}
    </section>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {sec('ガチャを選ぶ *',
        hasGacha ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FFF8D0', borderRadius: 12 }}>
            {form.gachaImageUrl
              ? <img src={form.gachaImageUrl} alt={form.gachaName} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F2B80044', flexShrink: 0 }} />}
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{form.gachaName}</span>
            <button onClick={() => { set({ ...EMPTY, spotId: initialSpotId, spotName: initialSpotName }); setVErr(v => ({ ...v, gacha: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
              <X size={16} color="#AAA" />
            </button>
          </div>
        ) : initialSpotId ? (
          <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds}
            onSelect={(id, name, img, lineup) => {
              set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
              setVErr(v => ({ ...v, gacha: undefined }));
            }} />
        ) : (
          <GachaSearch onSelect={(id, name, img, lineup) => {
            set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
            setVErr(v => ({ ...v, gacha: undefined }));
          }} />
        ),
        false, vErr.gacha
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {sec('結果 *',
          <ResultSelector value={form.result} onChange={v => { set({ result: v }); setVErr(e => ({ ...e, result: undefined })); }} />,
          !hasGacha, vErr.result
        )}
        {sec('アイテム *',
          <ItemSelector items={form.gachaLineup} value={form.itemName} onChange={v => { set({ itemName: v }); setVErr(e => ({ ...e, item: undefined })); }} />,
          !hasGacha, vErr.item
        )}
      </div>

      {sec('お店を選ぶ *',
        form.spotId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F5F3ED', borderRadius: 12 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{form.spotName}</span>
            <button onClick={() => { set({ spotId: '', spotName: '' }); setVErr(e => ({ ...e, spot: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 12, color: '#AAA' }}>
              変更
            </button>
          </div>
        ) : (
          <SpotSearchPanel
            gachaId={form.gachaId} gachaName={form.gachaName} gachaImageUrl={form.gachaImageUrl}
            accentColor="#F2B800"
            onSelect={(id, name) => { set({ spotId: id, spotName: name }); setVErr(e => ({ ...e, spot: undefined })); }} />
        ),
        !hasGacha, vErr.spot
      )}

      {sec('写真（任意）',
        <ImageUploader value={form.imageUrl} onChange={url => set({ imageUrl: url })} accentColor="#F2B800" />
      )}

      {sec('メモ（任意）',
        <textarea value={form.memo} onChange={e => set({ memo: e.target.value })}
          placeholder="ひとことメモ…" rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                   border: '1.5px solid #EDE9D8', outline: 'none', resize: 'vertical', color: '#333', boxSizing: 'border-box' }} />
      )}

      {error && <p style={{ color: '#E53E3E', fontSize: 13 }}>{error}</p>}

      <button onClick={submit} disabled={submitting}
        style={{
          padding: '16px 0', borderRadius: 14, border: 'none',
          background: submitting ? '#ccc' : '#F2B800',
          color: 'white', fontSize: 16, fontWeight: 800,
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}>
        {submitting ? '投稿中…' : '投稿する'}
      </button>
    </div>
  );
}

// ─── スタイルヘルパー ─────────────────────────────────────────────────────

const skipBtnStyle: React.CSSProperties = {
  flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #EDE9D8',
  background: 'white', fontSize: 14, color: '#AAA', cursor: 'pointer', fontWeight: 600,
};

const nextBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
  background: active ? '#F2B800' : '#F0EDDF', color: active ? 'white' : '#CCC',
  fontSize: 14, fontWeight: 800, cursor: active ? 'pointer' : 'not-allowed',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
});


function NormalPostForm(props: { onDone?: () => void; initialSpotId?: string; initialSpotName?: string; initialFilterGachaIds?: string[] }) {
  return <MobileForm {...props} />;
}
export { NormalPostForm };
