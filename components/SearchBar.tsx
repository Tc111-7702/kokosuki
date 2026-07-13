'use client';

import { useState, useRef } from 'react';
import { MapPin, Search, X, Store, TrainFront } from 'lucide-react';

interface Suggestion {
  label: string;
  sublabel?: string;
  type?: 'gacha' | 'genre' | 'spot' | 'area' | 'station';
  lat?: number;
  lng?: number;
  imageUrl?: string | null;
}

interface SearchBarProps {
  onSearch: (location: string, content: string, coords?: { lat: number; lng: number }) => void;
  onClear: () => void;
  hasSearchResult: boolean;
}

export default function SearchBar({ onSearch, onClear, hasSearchResult }: SearchBarProps) {
  const [value, setValue]             = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focused, setFocused]         = useState(false);
  const selectedCoordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const enc = encodeURIComponent(v);
        const [spotsRes, areaRes, stationRes, contentRes] = await Promise.all([
          fetch(`/api/spots/search?name=${enc}&suggest=1`),
          fetch(`/api/area-suggest?q=${enc}`),
          fetch(`/api/station-suggest?q=${enc}`),
          fetch(`/api/gacha/search?q=${enc}&suggest=1`),
        ]);
        const spotData    = await spotsRes.json();
        const areaData    = await areaRes.json();
        const stationData = await stationRes.json();
        const contentData = await contentRes.json();

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
        const contents: Suggestion[] = (contentData.suggestions ?? []);

        const usedLabels = new Set(spots.map(s => s.label));
        const locSugg = [
          ...spots,
          ...areas.filter(a => !usedLabels.has(a.label)),
          ...stations.filter(s => !usedLabels.has(s.label)),
        ];

        // 位置情報最大4件 + コンテンツ全件（IPのシリーズをすべて表示するため）
        setSuggestions([...locSugg.slice(0, 4), ...contents]);
      } catch {}
    }, 150);
  };

  const isContentType = (type?: string) => type === 'gacha' || type === 'genre';

  const selectSugg = (s: Suggestion) => {
    setValue(s.label);
    setSuggestions([]);
    if (isContentType(s.type)) {
      onSearch('', s.label);
    } else {
      const coords = s.lat !== undefined && s.lng !== undefined ? { lat: s.lat, lng: s.lng } : undefined;
      onSearch(s.label, '', coords);
    }
  };

  const submit = () => {
    if (!value.trim()) return;
    setSuggestions([]);
    onSearch(value, '', selectedCoordsRef.current);
    selectedCoordsRef.current = undefined;
  };

  const clear = () => {
    setValue('');
    setSuggestions([]);
    selectedCoordsRef.current = undefined;
    onClear();
  };

  const hasInput = value || hasSearchResult;
  const showDrop = focused && suggestions.length > 0;

  return (
    // outer: no horizontal padding so dropdown can be full-width
    <div className="relative pb-1">
      <div className="flex gap-1.5 items-center px-4">
        <div className="flex-1">
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
            style={{
              background: '#F5F3ED',
              border: focused ? '1.5px solid #F2B800' : '1.5px solid transparent',
              transition: 'border-color 0.15s',
            }}
          >
            <Search size={13} color="#aaa" className="flex-shrink-0" />
            <input
              type="text"
              value={value}
              onChange={e => {
                setValue(e.target.value);
                selectedCoordsRef.current = undefined;
                fetchSuggestions(e.target.value);
              }}
              onFocus={() => { setFocused(true); fetchSuggestions(value); }}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="駅・都道府県・市区町村 / IP・ガチャ"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, width: '100%', color: '#333', textAlign: 'left' }}
            />
            {value && (
              <button
                onMouseDown={() => { setValue(''); setSuggestions([]); selectedCoordsRef.current = undefined; }}
                style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
              >
                <X size={13} color="#bbb" />
              </button>
            )}
          </div>
        </div>

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

      {/* dropdown: left-0 right-0 relative to outer → full component width */}
      {showDrop && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
          style={{ top: '100%', background: 'white', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', maxHeight: 320, overflowY: 'auto', border: '1px solid #f0f0f0' }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2.5 active:bg-amber-50"
              style={{ display: 'block', borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none' }}
              onMouseDown={() => selectSugg(s)}
            >
              {isContentType(s.type) ? (
                /* ガチャ・ジャンル: 画像左端 */
                <div className="flex items-center gap-2">
                  {s.type === 'gacha' && s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.label}
                      style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 28, height: 28, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#222', flex: 1 }}>{s.label}</span>
                  {s.type === 'genre' && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0, background: '#e0f2fe', color: '#0369a1' }}>ジャンル</span>
                  )}
                </div>
              ) : (
                /* 店舗・駅・エリア: 既存スタイル維持 */
                <div className="flex items-start gap-1.5">
                  {s.type === 'spot'
                    ? <Store size={11} color="#F2B800" className="flex-shrink-0 mt-0.5" />
                    : s.type === 'station'
                    ? <TrainFront size={11} color="#3b82f6" className="flex-shrink-0 mt-0.5" />
                    : <MapPin size={11} color="#aaa" className="flex-shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#222', lineHeight: 1.4 }} className="truncate">{s.label}</span>
                      {s.type === 'spot'    && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0, background: '#fef9c3', color: '#854d0e' }}>店舗</span>}
                      {s.type === 'station' && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0, background: '#dbeafe', color: '#1d4ed8' }}>駅</span>}
                    </div>
                    {s.sublabel && (s.type === 'station' || s.type === 'spot') && (
                      <div style={{ fontSize: 10, color: '#999', lineHeight: 1.3, marginTop: 1 }}>{s.sublabel}</div>
                    )}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
