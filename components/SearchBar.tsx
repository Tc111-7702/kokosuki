'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Gamepad2, Search, X, Store, TrainFront } from 'lucide-react';

interface Suggestion {
  label: string;
  sublabel?: string;
  type?: 'gacha' | 'genre' | 'spot' | 'area' | 'station';
  lat?: number;
  lng?: number;
}

interface SearchBarProps {
  onSearch: (location: string, content: string, coords?: { lat: number; lng: number }) => void;
  onClear: () => void;
  hasSearchResult: boolean;
}

export default function SearchBar({ onSearch, onClear, hasSearchResult }: SearchBarProps) {
  const [locValue, setLocValue]             = useState('');
  const [contentValue, setContentValue]     = useState('');
  const [locSugg, setLocSugg]               = useState<Suggestion[]>([]);
  const [contentSugg, setContentSugg]       = useState<Suggestion[]>([]);
  const [locFocused, setLocFocused]         = useState(false);
  const [contentFocused, setContentFocused] = useState(false);
  const selectedCoordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 640); }, []);
  const locTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLocSugg = (v: string) => {
    if (locTimer.current) clearTimeout(locTimer.current);
    if (!v.trim()) { setLocSugg([]); return; }
    locTimer.current = setTimeout(async () => {
      try {
        const [spotsRes, areaRes, stationRes] = await Promise.all([
          fetch(`/api/spots/search?name=${encodeURIComponent(v)}&suggest=1`),
          fetch(`/api/area-suggest?q=${encodeURIComponent(v)}`),
          fetch(`/api/station-suggest?q=${encodeURIComponent(v)}`),
        ]);
        const spotData    = await spotsRes.json();
        const areaData    = await areaRes.json();
        const stationData = await stationRes.json();
        const spots: Suggestion[] = (spotData.suggestions ?? []).map(
          (s: { name: string; address: string }) => ({ label: s.name, sublabel: s.address, type: 'spot' as const })
        );
        const areas: Suggestion[] = (areaData.suggestions ?? []).map(
          (s: { label: string; sublabel?: string }) => ({ label: s.label, sublabel: s.sublabel, type: 'area' as const })
        );
        const stations: Suggestion[] = (stationData.suggestions ?? []).map(
          (s: { label: string; sublabel: string; lat: number; lng: number }) => ({
            label: s.label, sublabel: s.sublabel, type: 'station' as const, lat: s.lat, lng: s.lng,
          })
        );
        const usedLabels = new Set(spots.map(s => s.label));
        setLocSugg([
          ...spots,
          ...areas.filter(a => !usedLabels.has(a.label)),
          ...stations.filter(s => !usedLabels.has(s.label)),
        ]);
      } catch {}
    }, 150);
  };

  const fetchContentSugg = (v: string) => {
    if (contentTimer.current) clearTimeout(contentTimer.current);
    if (!v.trim()) { setContentSugg([]); return; }
    contentTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`);
        const data = await res.json();
        setContentSugg(data.suggestions ?? []);
      } catch {}
    }, 150);
  };

  const submit = () => {
    setLocSugg([]); setContentSugg([]);
    onSearch(locValue, contentValue, selectedCoordsRef.current);
    selectedCoordsRef.current = undefined;
  };

  const clear = () => {
    setLocValue(''); setContentValue('');
    setLocSugg([]); setContentSugg([]);
    selectedCoordsRef.current = undefined;
    onClear();
  };

  const selectLocSugg = (s: Suggestion) => {
    setLocValue(s.label);
    setLocSugg([]);
    if (s.lat !== undefined && s.lng !== undefined) {
      selectedCoordsRef.current = { lat: s.lat, lng: s.lng };
    } else {
      selectedCoordsRef.current = undefined;
    }
  };

  const hasInput = locValue || contentValue || hasSearchResult;
  const showLocDrop     = locFocused && locSugg.length > 0;
  const showContentDrop = contentFocused && contentSugg.length > 0;

  /* ── 位置情報入力欄 JSX ── */
  const locInputJsx = (
    <div className="relative flex-1">
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl"
        style={{
          background: '#F5F3ED',
          border: locFocused ? '1.5px solid #F2B800' : '1.5px solid transparent',
          transition: 'border-color 0.15s',
        }}
      >
        <MapPin size={11} color="#aaa" className="flex-shrink-0" />
        <input
          type="text"
          value={locValue}
          onChange={e => { setLocValue(e.target.value); selectedCoordsRef.current = undefined; fetchLocSugg(e.target.value); }}
          onFocus={() => { setLocFocused(true); fetchLocSugg(locValue); }}
          onBlur={() => setTimeout(() => setLocFocused(false), 200)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="店舗名・駅・都道府県/市区町村"
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, width: '100%', color: '#333' }}
        />
        {locValue && (
          <button onMouseDown={() => { setLocValue(''); setLocSugg([]); selectedCoordsRef.current = undefined; }}
            style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
            <X size={11} color="#bbb" />
          </button>
        )}
      </div>
      {showLocDrop && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-y-auto z-50"
          style={{ top: '100%', background: 'white', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', maxHeight: 320, border: '1px solid #f0f0f0' }}>
          {locSugg.map((s, i) => (
            <button key={i} className="w-full text-left px-3 py-2.5 active:bg-amber-50"
              style={{ borderBottom: i < locSugg.length - 1 ? '1px solid #f5f5f5' : 'none' }}
              onMouseDown={() => selectLocSugg(s)}>
              <div className="flex items-start gap-1.5">
                {s.type === 'spot'
                  ? <Store size={11} color="#F2B800" className="flex-shrink-0 mt-0.5" />
                  : s.type === 'station'
                  ? <TrainFront size={11} color="#3b82f6" className="flex-shrink-0 mt-0.5" />
                  : <MapPin size={11} color="#aaa" className="flex-shrink-0 mt-0.5" />
                }
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#222', lineHeight: 1.4 }} className="truncate">{s.label}</span>
                    {s.type === 'spot' && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0, background: '#fef9c3', color: '#854d0e' }}>店舗</span>}
                    {s.type === 'station' && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0, background: '#dbeafe', color: '#1d4ed8' }}>駅</span>}
                  </div>
                  {s.sublabel && (s.type === 'station' || s.type === 'spot') && (
                    <div style={{ fontSize: 10, color: '#999', lineHeight: 1.3, marginTop: 1 }}>{s.sublabel}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ── コンテンツ入力欄 JSX ── */
  const contentInputJsx = (
    <div className="relative flex-1">
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl"
        style={{
          background: '#F5F3ED',
          border: contentFocused ? '1.5px solid #F2B800' : '1.5px solid transparent',
          transition: 'border-color 0.15s',
        }}
      >
        <Gamepad2 size={11} color="#aaa" className="flex-shrink-0" />
        <input
          type="text"
          value={contentValue}
          onChange={e => { setContentValue(e.target.value); fetchContentSugg(e.target.value); }}
          onFocus={() => { setContentFocused(true); fetchContentSugg(contentValue); }}
          onBlur={() => setTimeout(() => setContentFocused(false), 200)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="ガチャ名・ジャンル"
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, width: '100%', color: '#333' }}
        />
        {contentValue && (
          <button onMouseDown={() => { setContentValue(''); setContentSugg([]); }}
            style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
            <X size={11} color="#bbb" />
          </button>
        )}
      </div>
      {showContentDrop && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-y-auto z-50"
          style={{ top: '100%', background: 'white', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', maxHeight: 320, border: '1px solid #f0f0f0' }}>
          {contentSugg.map((s, i) => (
            <button key={i} className="w-full text-left px-3 py-2.5 active:bg-amber-50"
              style={{ borderBottom: i < contentSugg.length - 1 ? '1px solid #f5f5f5' : 'none' }}
              onMouseDown={() => { setContentValue(s.label); setContentSugg([]); }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 12, fontWeight: 600, color: '#222', lineHeight: 1.4, flex: 1, textAlign: 'left' }}>{s.label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                  background: s.type === 'genre' ? '#e0f2fe' : '#fef9c3',
                  color: s.type === 'genre' ? '#0369a1' : '#854d0e' }}>
                  {s.type === 'genre' ? 'ジャンル' : 'ガチャ'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative px-4 pb-1">
      {isMobile ? (
        /* ── モバイル: 入力2つを縦積み、右に検索ボタンを垂直中央 ── */
        <div className="flex gap-1.5 items-stretch">
          <div className="flex-1 flex flex-col gap-1">
            {locInputJsx}
            {contentInputJsx}
          </div>
          <div className="flex flex-col gap-1 items-center justify-center">
            {hasInput && (
              <button onClick={clear}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: '#eee' }}>
                <X size={13} color="#666" />
              </button>
            )}
            <button onClick={submit}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
              style={{ background: '#F2B800' }}>
              <Search size={14} color="white" />
            </button>
          </div>
        </div>
      ) : (
        /* ── デスクトップ: 横並び ── */
        <div className="flex gap-1.5 items-center">
          {locInputJsx}
          {contentInputJsx}
          {hasInput && (
            <button onClick={clear}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              style={{ background: '#eee' }}>
              <X size={13} color="#666" />
            </button>
          )}
          <button onClick={submit}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 hover:scale-110 active:scale-90 transition-transform"
            style={{ background: '#F2B800' }}>
            <Search size={14} color="white" />
          </button>
        </div>
      )}
    </div>
  );
}
