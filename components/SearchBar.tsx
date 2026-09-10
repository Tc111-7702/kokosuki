'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, X, ArrowLeft } from 'lucide-react';

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
  currentPos?: { lat: number; lng: number } | null;
}

export default function SearchBar({ onSearch, onClear, hasSearchResult, currentPos }: SearchBarProps) {
  const [value, setValue]             = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focused, setFocused]         = useState(false);
  const selectedCoordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const enc = encodeURIComponent(v);
        const spotParams = new URLSearchParams({ name: v, suggest: '1' });
        if (currentPos) {
          spotParams.set('lat', String(currentPos.lat));
          spotParams.set('lng', String(currentPos.lng));
        }
        const [spotsRes, areaRes, stationRes, contentRes] = await Promise.all([
          fetch(`/api/spots/search?${spotParams}`),
          fetch(`/api/area-suggest?q=${enc}`),
          fetch(`/api/station-suggest?q=${enc}`),
          fetch(`/api/gacha/search?q=${enc}&suggest=1`),
        ]);
        const spotData    = await spotsRes.json();
        const areaData    = await areaRes.json();
        const stationData = await stationRes.json();
        const contentData = await contentRes.json();

        const spots: Suggestion[] = (spotData.suggestions ?? []).map(
          (s: { name: string; address: string; lat: number; lng: number }) => ({
            label: s.name,
            sublabel: s.address,
            type: 'spot' as const,
            lat: s.lat,
            lng: s.lng,
          })
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

        const storeSugg = spots.slice(0, 10);
        const usedLabels = new Set(storeSugg.map(s => s.label));
        const locSugg = [
          ...storeSugg,
          ...areas.filter(a => !usedLabels.has(a.label)),
          ...stations.filter(s => !usedLabels.has(s.label)),
        ];

        // 店舗最大10件（近い順）+ エリア・駅 + コンテンツ全件
        setSuggestions([...locSugg, ...contents]);
      } catch {}
    }, 150);
  }, [currentPos]);

  useEffect(() => {
    if (value.trim() && currentPos) fetchSuggestions(value);
  }, [currentPos, value, fetchSuggestions]);

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

  const showDrop = focused && suggestions.length > 0;
  const locSuggestions = suggestions.filter(s => !isContentType(s.type));
  const contentSuggestions = suggestions.filter(s => isContentType(s.type));

  return (
    // outer: no horizontal padding so dropdown can be full-width
    <div className="relative pb-1">
      <div className="flex gap-1.5 items-center px-4">
        {hasSearchResult && (
          <button onClick={clear} aria-label="検索を解除"
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            style={{ background: '#eee' }}>
            <ArrowLeft size={16} color="#666" />
          </button>
        )}
        <div className="flex-1">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-2xl"
            style={{ background: '#F5F3ED' }}
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
      </div>

      {/* dropdown: left-0 right-0 relative to outer → full component width */}
      {showDrop && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
          style={{ top: '100%', background: 'white', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', maxHeight: 320, overflowY: 'auto', border: '1px solid #f0f0f0' }}
        >
          {locSuggestions.map((s, i) => (
            <button
              key={`loc-${i}`}
              className="w-full text-left px-2.5 md:px-3 py-2 md:py-2.5 active:bg-amber-50"
              style={{ display: 'block', borderBottom: i < locSuggestions.length - 1 || contentSuggestions.length > 0 ? '1px solid #f5f5f5' : 'none' }}
              onMouseDown={() => selectSugg(s)}
            >
              {s.type === 'spot' || s.type === 'station' ? (
                <div className="min-w-0">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <span className="text-[11px] md:text-[13px] font-semibold text-[#222] leading-snug truncate">{s.label}</span>
                    {s.type === 'spot' && (
                      <span className="text-[8px] md:text-[9px] font-bold px-1.5 py-0 rounded-full flex-shrink-0 bg-[#fef9c3] text-[#854d0e]">店舗</span>
                    )}
                    {s.type === 'station' && (
                      <span className="text-[8px] md:text-[9px] font-bold px-1.5 py-0 rounded-full flex-shrink-0 bg-[#dbeafe] text-[#1d4ed8]">駅</span>
                    )}
                  </div>
                  {s.sublabel && (
                    <div className="text-[9px] md:text-[10px] text-[#999] leading-snug mt-0.5">{s.sublabel}</div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-1 md:gap-1.5">
                  <MapPin color="#aaa" className="flex-shrink-0 mt-0.5 w-[9px] h-[9px] md:w-[11px] md:h-[11px]" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] md:text-[13px] font-semibold text-[#222] leading-snug truncate">{s.label}</span>
                  </div>
                </div>
              )}
            </button>
          ))}
          {contentSuggestions.length > 0 && (
            <div className="px-2.5 md:px-3 py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold text-gray-400 bg-gray-50 border-b border-gray-100">ガチャ・IP</div>
          )}
          {contentSuggestions.map((s, i) => (
            <button
              key={`content-${i}`}
              className={'w-full flex items-center justify-between px-2.5 md:px-3 py-1.5 md:py-2 active:bg-amber-50 text-left ' + (i < contentSuggestions.length - 1 ? 'border-b border-gray-100' : '')}
              onMouseDown={() => selectSugg(s)}
            >
              <span className="text-[11px] md:text-xs font-medium text-gray-800 min-w-0 pr-2">{s.label}</span>
              {s.type === 'genre' ? (
                <span className="text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0 md:py-0.5 rounded-full flex-shrink-0 bg-blue-100 text-blue-700">IP</span>
              ) : s.imageUrl ? (
                <img src={s.imageUrl} alt={s.label}
                  className="w-5 h-5 md:w-6 md:h-6 rounded-md object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
