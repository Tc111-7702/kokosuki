'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, ArrowLeft } from 'lucide-react';

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
  const currentPosRef = useRef(currentPos);
  useEffect(() => {
    currentPosRef.current = currentPos;
  }, [currentPos]);

  const fetchSuggestions = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const enc = encodeURIComponent(v);
        const spotParams = new URLSearchParams({ name: v, suggest: '1' });
        const pos = currentPosRef.current;
        if (pos) {
          spotParams.set('lat', String(pos.lat));
          spotParams.set('lng', String(pos.lng));
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

        setSuggestions([...locSugg, ...contents]);
      } catch {}
    }, 150);
  }, []);

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

  const clearInput = () => {
    setValue('');
    setSuggestions([]);
    selectedCoordsRef.current = undefined;
  };

  const clear = () => {
    clearInput();
    onClear();
  };

  const showDrop = focused && suggestions.length > 0;
  const locSuggestions = suggestions.filter(s => !isContentType(s.type));
  const contentSuggestions = suggestions.filter(s => isContentType(s.type));

  return (
    <div className="relative px-4 py-1.5 lg:py-2">
      <div className="flex items-center gap-1.5">
        {hasSearchResult && (
          <button
            type="button"
            onClick={clear}
            aria-label="検索を解除"
            className="community-search-back-btn flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 active:opacity-70 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="relative flex-1 min-w-0">
          <div className="community-search-input-shell flex items-center gap-2 px-3 py-1.5 lg:py-2.5 rounded-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" className="flex-shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" />
            </svg>
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
              className="community-search-input shell-field flex-1 bg-transparent text-xs lg:text-sm outline-none min-w-0"
              style={{ fontSize: 13, textAlign: 'left' }}
            />
            {value && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); clearInput(); }}
                aria-label="入力をクリア"
                className="home-search-clear-btn p-0 bg-transparent border-none cursor-pointer leading-none flex-shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {showDrop && (
            <div
              className="search-suggest-dropdown community-search-dropdown absolute top-full left-0 right-0 z-[100] mt-1 rounded-2xl shadow-xl"
              style={{ maxHeight: 320, overflowY: 'auto' }}
            >
              {locSuggestions.map((s, i) => (
                <button
                  key={`loc-${i}`}
                  className="search-suggest-item block px-3 py-2 lg:py-2.5"
                  onMouseDown={e => { e.preventDefault(); selectSugg(s); }}
                >
                  {s.type === 'spot' || s.type === 'station' ? (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="search-suggest-label text-xs lg:text-sm font-semibold leading-snug truncate">{s.label}</span>
                        {s.type === 'spot' && (
                          <span className="text-[9px] lg:text-[10px] font-bold px-1.5 py-0 rounded-full flex-shrink-0 bg-[#fef9c3] text-[#854d0e]">店舗</span>
                        )}
                        {s.type === 'station' && (
                          <span className="text-[9px] lg:text-[10px] font-bold px-1.5 py-0 rounded-full flex-shrink-0 bg-[#dbeafe] text-[#1d4ed8]">駅</span>
                        )}
                      </div>
                      {s.sublabel && (
                        <div className="search-suggest-sublabel text-[10px] lg:text-xs leading-snug mt-0.5">{s.sublabel}</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <MapPin color="#aaa" className="flex-shrink-0 mt-0.5 w-[11px] h-[11px] lg:w-3 lg:h-3" />
                      <div className="min-w-0 flex-1">
                        <span className="search-suggest-label text-xs lg:text-sm font-semibold leading-snug truncate">{s.label}</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
              {contentSuggestions.length > 0 && (
                <div className="search-suggest-section px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs">ガチャ・IP</div>
              )}
              {contentSuggestions.map((s, i) => (
                <button
                  key={`content-${i}`}
                  className="search-suggest-item flex items-center justify-between px-3 py-2 lg:py-2.5"
                  onMouseDown={e => { e.preventDefault(); selectSugg(s); }}
                >
                  <span className="search-suggest-label text-xs lg:text-sm font-medium min-w-0 pr-2">{s.label}</span>
                  {s.type === 'genre' ? (
                    <span className="text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-blue-100 text-blue-700">IP</span>
                  ) : s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.label}
                      className="w-6 h-6 lg:w-7 lg:h-7 rounded-md object-cover flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
