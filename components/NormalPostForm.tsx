'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { SpotSearchPanel } from '@/components/SpotSearchPanel';
import { SpotGachaPicker } from '@/components/SpotGachaPicker';
import { PopularIpTagList, SearchTagsDivider } from '@/components/PopularIpTagList';
import { useIsMobile } from '@/lib/useIsMobile';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { POST_STEP_NEXT_GAP, POST_SPOT_STEP_NEXT_GAP, POST_GACHA_BODY_HEIGHT, POST_STEP_CONTENT_BOTTOM } from '@/lib/postFormMobileLayout';
import {
  PostImageFrame,
  POST_IMAGE_FEED_WIDTH_CLASS,
  POST_IMAGE_PREVIEW_DESKTOP_CLASS,
} from '@/components/PostImageFrame';

// ─── 型 ─────────────────────────────────────────────────────────────────

interface GachaSuggestion { id?: string; label: string; type: 'gacha' | 'genre'; imageUrl?: string | null }

type Step = 'gacha' | 'spot' | 'result' | 'item' | 'photo' | 'memo' | 'confirm';
const STEPS: Step[] = ['gacha', 'spot', 'result', 'item', 'photo', 'memo', 'confirm'];
const STEP_LABELS: Record<Step, string> = {
  gacha:   'ガチャを選ぶ',
  spot:    'お店を選ぶ',
  result:  '結果を選ぶ',
  item:    'アイテムを選ぶ',
  photo:   '写真（任意）',
  memo:    '本文（任意）',
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

function GachaSearch({ onSelect, onClear, onResolvingChange }: {
  onSelect: (id: string, name: string, imageUrl: string | null, lineup: string[]) => void;
  onClear?: () => void;
  /** ガチャ解決中(true)を親へ通知。解決中は「次へ」を無効化するために使う。 */
  onResolvingChange?: (resolving: boolean) => void;
}) {
  const [query, setQuery]             = useState('');
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
    fetch('/api/gacha/popular-ips').then(r => r.json())
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
        const d = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        setSuggestions((d.suggestions ?? []).filter((s: GachaSuggestion) => s.type === 'gacha'));
      } catch { /* silent */ }
    }, 150);
  };

  const handleSelect = async (label: string) => {
    // 解決中は「次へ」を無効化（gachaId は消さず、確定時に onSelect で確実に有効へ戻す）。
    setQuery(label); setSuggestions([]); setResolving(true); onResolvingChange?.(true);
    try {
      const searchData = await fetch(`/api/gacha/search?q=${encodeURIComponent(label)}`).then(r => r.json());
      const id: string = searchData.gachaIds?.[0] ?? '';
      if (id) {
        const gd = await fetch(`/api/gacha/${id}`).then(r => r.json());
        onSelect(id, label, gd.gacha?.imageUrl ?? null, gd.gacha?.lineup ?? []);
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
              <div className="animate-spin rounded-full border-2 border-t-transparent flex-shrink-0" style={{ width: 15, height: 15, borderColor: '#F2B800', borderTopColor: 'transparent' }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            )}
            <input
              type="text"
              value={query}
              placeholder="引いたガチャをさがす"
              onChange={e => { setQuery(e.target.value); fetchSuggestions(e.target.value); }}
              onFocus={() => { setFocused(true); if (query) fetchSuggestions(query); }}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              disabled={resolving}
              className="community-search-input shell-field flex-1 bg-transparent text-xs lg:text-sm outline-none min-w-0"
              style={{ fontSize: isMobile ? 12 : 14, textAlign: 'left' }}
            />
            {query && !resolving && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setQuery(''); setSuggestions([]); onClear?.(); }}
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
                    style={{ fontSize: isMobile ? 12 : 14, paddingRight: 8 }}
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
        marginBottom={POST_STEP_NEXT_GAP}
        onIpClick={ip => { setQuery(ip); setFocused(true); fetchSuggestions(ip); }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  const tagStyle = (selected: boolean): React.CSSProperties => {
    if (selected) {
      return isDark
        ? { background: 'rgba(242, 184, 0, 0.16)', border: '2px solid #F2B800', color: '#F2B800' }
        : { background: '#FFF8D0', border: '2px solid #F2B800', color: '#8A6800' };
    }
    return isDark
      ? { background: 'rgba(255, 255, 255, 0.08)', border: '1.5px solid #262626', color: '#d4d4d4' }
      : { background: 'rgba(245, 243, 237, 0.5)', border: '1.5px solid #EDE9D8', color: '#555' };
  };

  if (items.length === 0) {
    return (
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="アイテム名を入力"
        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14,
                 border: '1.5px solid #EDE9D8', outline: 'none', color: '#333', boxSizing: 'border-box' }} />
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {items.map(item => {
        const selected = value === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(selected ? '' : item)}
            style={{
              padding: '6px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.12s',
              ...tagStyle(selected),
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

// ─── ステップヘッダー（モバイル用） ─────────────────────────────────────

function StepHeader({ step, onBack }: { step: Step; onBack?: () => void }) {
  const idx = STEPS.indexOf(step);
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

// ─── 確認画面サマリー（モバイル） ─────────────────────────────────────────

function MobileConfirmSummary({ form }: { form: FormState }) {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: isDark ? '#737373' : '#AAA', minWidth: 44, flexShrink: 0, lineHeight: 1.4,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 11, color: isDark ? '#FFFFFF' : '#222', fontWeight: 600, flex: 1, minWidth: 0, lineHeight: 1.4,
    overflowWrap: 'anywhere', wordBreak: 'break-word',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', background: isDark ? '#0a0a0a' : '#FAFAF6', borderRadius: 10,
    overflow: 'hidden',
  };
  const photoBlockStyle: React.CSSProperties = {
    padding: '8px 12px', background: isDark ? '#0a0a0a' : '#FAFAF6', borderRadius: 10,
  };
  const resultOpt = RESULT_OPTIONS.find(o => o.value === form.result);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
      <div style={rowStyle}>
        <span style={labelStyle}>ガチャ</span>
        <span style={valueStyle}>{form.gachaName}</span>
        {form.gachaImageUrl ? (
          <img
            src={form.gachaImageUrl}
            alt=""
            style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#F2B80033', flexShrink: 0 }} />
        )}
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>お店</span>
        <span style={valueStyle}>{form.spotName}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>結果</span>
        {resultOpt ? (
          <span className={`inline-flex px-3 py-0.5 rounded-full text-[11px] font-bold ${resultOpt.selCls}`}>
            {resultOpt.label}
          </span>
        ) : (
          <span style={valueStyle}>{form.result}</span>
        )}
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>アイテム</span>
        <span style={valueStyle}>{form.itemName}</span>
      </div>

      <div style={photoBlockStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: form.imageUrl ? 8 : 0,
        }}>
          <span style={labelStyle}>写真</span>
          {!form.imageUrl && (
            <span style={{ ...valueStyle, color: isDark ? '#737373' : '#AAA', fontWeight: 500 }}>なし</span>
          )}
        </div>
        {form.imageUrl ? (
          <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden">
            <img
              src={form.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : null}
      </div>

      <div style={{ ...rowStyle, alignItems: form.memo ? 'flex-start' : 'center' }}>
        <span style={labelStyle}>本文</span>
        {form.memo ? (
          <span style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{form.memo}</span>
        ) : (
          <span style={{ ...valueStyle, color: isDark ? '#737373' : '#AAA', fontWeight: 500 }}>なし</span>
        )}
      </div>
    </div>
  );
}

// ─── モバイル：ステップ形式 ───────────────────────────────────────────────

function MobileForm({ onDone, initialSpotId = '', initialSpotName = '', initialFilterGachaIds = [], initialSearch = '' }: {
  onDone?: () => void;
  initialSpotId?: string;
  initialSpotName?: string;
  initialFilterGachaIds?: string[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('gacha');
  const [gachaResolving, setGachaResolving] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    spotId: initialSpotId,
    spotName: initialSpotName,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError]           = useState('');
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

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
      if (onDone) onDone(); else router.push('/home?tab=community&posted=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally { setSubmitting(false); }
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
    <div style={{ padding: '12px 10px', maxWidth: 480, margin: '0 auto' }}>

      {step === 'gacha' && card(<>
        <StepHeader step="gacha" />
        {initialSpotId ? (
          <>
            <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds} initialQuery={initialSearch}
              selectedId={form.gachaId}
              onSelect={(id, name, img, lineup) => {
                set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
              }} />
            <button onClick={goNext} disabled={!form.gachaId}
              style={{ ...nextBtnStyle(!!form.gachaId, isDark), marginTop: 32, width: '100%' }}>
              次へ <ChevronRight size={14} />
            </button>
          </>
        ) : (
          <>
            <GachaSearch
              onSelect={(id, name, img, lineup) => {
                set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
              }}
              onClear={() => set({ gachaId: '', gachaName: '', gachaImageUrl: null, gachaLineup: [] })}
              onResolvingChange={setGachaResolving}
            />
            <button onClick={goNext} disabled={!form.gachaId || gachaResolving}
              style={{ ...nextBtnStyle(!!form.gachaId && !gachaResolving, isDark), width: '100%' }}>
              次へ <ChevronRight size={14} />
            </button>
          </>
        )}
      </>)}

      {step === 'spot' && card(<>
        <StepHeader step="spot" onBack={goBack} />
        {form.spotId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#FFFBE6', borderRadius: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', flex: 1 }}>{form.spotName}</span>
            <button onClick={() => set({ spotId: '', spotName: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#F2B800', fontWeight: 700 }}>
              変更
            </button>
          </div>
        ) : (
          <SpotSearchPanel
            gachaId={form.gachaId} gachaName={form.gachaName}
            accentColor="#F2B800"
            onSelect={(id, name) => { set({ spotId: id, spotName: name }); }} />
        )}
        <button onClick={goNext} disabled={!form.spotId}
          style={{ ...nextBtnStyle(!!form.spotId, isDark), marginTop: form.spotId ? POST_SPOT_STEP_NEXT_GAP : 0, width: '100%' }}>
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'result' && card(<>
        <StepHeader step="result" onBack={goBack} />
        <ResultSelector value={form.result} onChange={v => set({ result: v })} />
        <button onClick={goNext} disabled={!form.result}
          style={{ ...nextBtnStyle(!!form.result, isDark), marginTop: 16, width: '100%' }}>
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'item' && card(<>
        <StepHeader step="item" onBack={goBack} />
        {/* 本文高さを予約し、次へを他ステップと同じく下部に配置。アイテムは内部スクロールなしで全表示。 */}
        <div style={{ minHeight: POST_STEP_CONTENT_BOTTOM }}>
          <ItemSelector items={form.gachaLineup} value={form.itemName} onChange={v => set({ itemName: v })} />
        </div>
        <button onClick={goNext} disabled={!form.itemName}
          style={{ ...nextBtnStyle(!!form.itemName, isDark), marginTop: POST_STEP_NEXT_GAP, width: '100%' }}>
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'photo' && card(<>
        <StepHeader step="photo" onBack={goBack} />
        <ImageUploader
          value={form.imageUrl}
          onChange={url => set({ imageUrl: url })}
          onUploadingChange={setImageUploading}
          matchFeedSize
          accentColor="#F2B800"
        />
        <button
          onClick={goNext}
          disabled={imageUploading}
          style={{ ...nextBtnStyle(!imageUploading, isDark), marginTop: 16, width: '100%' }}
        >
          次へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'memo' && card(<>
        <StepHeader step="memo" onBack={goBack} />
        <textarea value={form.memo} onChange={e => set({ memo: e.target.value })}
          placeholder="本文を入力…" rows={4}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                   border: '1.5px solid #EDE9D8', outline: 'none', resize: 'none', color: '#333', boxSizing: 'border-box' }} />
        <button onClick={goNext} style={{ ...nextBtnStyle(true, isDark), marginTop: 16, width: '100%' }}>
          確認へ <ChevronRight size={14} />
        </button>
      </>)}

      {step === 'confirm' && card(<>
        <StepHeader step="confirm" onBack={goBack} />
        <MobileConfirmSummary form={form} />
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

// ─── 自動伸長テキストエリア（デスクトップ本文） ───────────────────────────

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
        border: '1.5px solid #EDE9D8', outline: 'none', color: '#333', boxSizing: 'border-box',
        resize: 'none', overflow: 'hidden', lineHeight: 1.4, minHeight: 42,
      }}
    />
  );
}

// ─── 画像アップロード共通コンポーネント ─────────────────────────────────

function ImageUploader({ value, onChange, onUploadingChange, matchFeedSize = false, accentColor = '#F2B800' }: {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  /** モバイルで PostCard と同じ表示幅にする */
  matchFeedSize?: boolean;
  accentColor?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingState(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d   = await res.json();
      if (d.url) onChange(d.url);
    } catch { /* silent */ }
    setUploadingState(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
        style={{ display: 'none' }} />
      {value ? (
        <div className={matchFeedSize ? POST_IMAGE_FEED_WIDTH_CLASS : POST_IMAGE_PREVIEW_DESKTOP_CLASS}>
          <PostImageFrame
            native
            src={value}
            alt="preview"
            overlay={
              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={12} color="white" />
              </button>
            }
          />
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

export function DesktopNormalForm({ onDone, initialSpotId = '', initialSpotName = '', initialFilterGachaIds = [], initialSearch = '' }: {
  onDone?: () => void;
  initialSpotId?: string;
  initialSpotName?: string;
  initialFilterGachaIds?: string[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    spotId: initialSpotId,
    spotName: initialSpotName,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError]           = useState('');
  const [vErr, setVErr]             = useState<ValidationErrors>({});
  const set = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }));
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const sectionTitleColor = (errMsg?: string) => (errMsg ? '#EF4444' : isDark ? '#FFFFFF' : '#AAAAAA');
  const selectedGachaChipStyle: React.CSSProperties = isDark
    ? {
        background: 'rgba(242, 184, 0, 0.2)',
        border: '2px solid #F2B800',
        boxShadow: '0 0 0 1px rgba(242, 184, 0, 0.45), 0 0 22px rgba(242, 184, 0, 0.32)',
      }
    : {
        background: '#FFF4B0',
        border: '2px solid #F2B800',
        boxShadow: '0 0 0 1px rgba(242, 184, 0, 0.3), 0 0 16px rgba(242, 184, 0, 0.28)',
      };
  const selectedSpotChipStyle: React.CSSProperties = isDark
    ? { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid #262626' }
    : { background: 'rgba(255, 255, 255, 0.45)', border: '1px solid #e5e7eb' };

  const hasGacha = !!form.gachaId;
  const canSubmit = hasGacha && !!form.result && !!form.itemName && !!form.spotId && !imageUploading;

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
      if (onDone) onDone(); else router.push('/home?tab=community&posted=1');
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
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: sectionTitleColor(errMsg), letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</p>
        {errMsg && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>⚠ {errMsg}</span>}
      </div>
      {content}
    </section>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {sec('ガチャを選ぶ（必須）',
        hasGacha ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
            ...selectedGachaChipStyle,
          }}>
            {form.gachaImageUrl
              ? <img src={form.gachaImageUrl} alt={form.gachaName} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F2B80044', flexShrink: 0 }} />}
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>{form.gachaName}</span>
            <button onClick={() => { set({ ...EMPTY, spotId: initialSpotId, spotName: initialSpotName }); setVErr(v => ({ ...v, gacha: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
              <X size={16} color="#AAA" />
            </button>
          </div>
        ) : initialSpotId ? (
          <SpotGachaPicker spotId={initialSpotId} filterGachaIds={initialFilterGachaIds} initialQuery={initialSearch}
            onSelect={(id, name, img, lineup) => {
              set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
              setVErr(v => ({ ...v, gacha: undefined }));
            }} />
        ) : (
          <GachaSearch
            onSelect={(id, name, img, lineup) => {
              set({ gachaId: id, gachaName: name, gachaImageUrl: img, gachaLineup: lineup });
              setVErr(v => ({ ...v, gacha: undefined }));
            }}
            onClear={() => {
              set({ gachaId: '', gachaName: '', gachaImageUrl: null, gachaLineup: [] });
              setVErr(v => ({ ...v, gacha: undefined }));
            }}
          />
        ),
        false, vErr.gacha
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {sec('結果（必須）',
          <ResultSelector value={form.result} onChange={v => { set({ result: v }); setVErr(e => ({ ...e, result: undefined })); }} />,
          !hasGacha, vErr.result
        )}
        {sec('アイテム（必須）',
          <ItemSelector items={form.gachaLineup} value={form.itemName} onChange={v => { set({ itemName: v }); setVErr(e => ({ ...e, item: undefined })); }} />,
          !hasGacha, vErr.item
        )}
      </div>

      {sec('お店を選ぶ（必須）',
        form.spotId ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
            ...selectedSpotChipStyle,
          }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A' }}>{form.spotName}</span>
            <button onClick={() => { set({ spotId: '', spotName: '' }); setVErr(e => ({ ...e, spot: undefined })); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 12, color: '#AAA' }}>
              変更
            </button>
          </div>
        ) : (
          <SpotSearchPanel
            gachaId={form.gachaId} gachaName={form.gachaName}
            accentColor="#F2B800"
            compactBottom
            onSelect={(id, name) => { set({ spotId: id, spotName: name }); setVErr(e => ({ ...e, spot: undefined })); }} />
        ),
        !hasGacha, vErr.spot
      )}

      {sec('写真（任意）',
        <ImageUploader
          value={form.imageUrl}
          onChange={url => set({ imageUrl: url })}
          onUploadingChange={setImageUploading}
          accentColor="#F2B800"
        />
      )}

      {sec('本文（任意）',
        <AutoGrowTextarea
          value={form.memo}
          onChange={v => set({ memo: v })}
          placeholder="本文を入力…"
        />
      )}

      {error && <p style={{ color: '#E53E3E', fontSize: 13 }}>{error}</p>}

      <button onClick={submit} disabled={submitting || !canSubmit}
        style={{
          padding: '16px 0', borderRadius: 14, border: 'none',
          background: submitting || !canSubmit ? '#ccc' : '#F2B800',
          color: 'white', fontSize: 16, fontWeight: 800,
          cursor: submitting || !canSubmit ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}>
        {submitting ? '投稿中…' : '投稿する'}
      </button>
    </div>
  );
}

// ─── スタイルヘルパー ─────────────────────────────────────────────────────

const nextBtnStyle = (active: boolean, isDark: boolean): React.CSSProperties => ({
  padding: '12px 0', borderRadius: 12, border: 'none',
  background: active ? '#F2B800' : isDark ? '#141414' : '#F0EDDF',
  color: active ? 'white' : isDark ? '#525252' : '#CCC',
  fontSize: 14, fontWeight: 800, cursor: active ? 'pointer' : 'not-allowed',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
});

function NormalPostForm(props: { onDone?: () => void; initialSpotId?: string; initialSpotName?: string; initialFilterGachaIds?: string[]; initialSearch?: string }) {
  return <MobileForm {...props} />;
}
export { NormalPostForm };
