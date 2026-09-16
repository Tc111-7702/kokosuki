'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import { fetchPostSpotSuggestions, type PostSpotSuggestion } from '@/lib/spotPostSuggest';
import { POST_SPOT_STEP_NEXT_GAP, POST_STEP_NEXT_GAP } from '@/lib/postFormMobileLayout';

// ─── 型 ────────────────────────────────────────────────────────────────

interface SpotResult {
  id: string;
  name: string;
  address: string;
  distance?: number;
}

function fmtDist(d?: number): string {
  if (d == null) return '';
  return d < 1000 ? Math.round(d) + 'm' : (d / 1000).toFixed(1) + 'km';
}

const MIN_SPOT_QUERY_LEN = 2;
const SPOT_SUGGEST_DEBOUNCE_MS = 250;

function isSpotQueryReady(v: string): boolean {
  return v.trim().length >= MIN_SPOT_QUERY_LEN;
}

// ─── メインコンポーネント ─────────────────────────────────────────────

export function SpotSearchPanel({
  gachaId,
  gachaName,
  accentColor = '#F2B800',
  compactBottom = false,
  onSelect,
}: {
  gachaId: string;
  gachaName: string;
  accentColor?: string;
  /** デスクトップ等、次へボタン用の下余白が不要な場合 */
  compactBottom?: boolean;
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery]               = useState('');
  const [focused, setFocused]           = useState(false);
  const [suggestions, setSuggestions]   = useState<PostSpotSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestFetched, setSuggestFetched] = useState(false);
  const [spots, setSpots]               = useState<SpotResult[]>([]);
  const [spotMessage, setSpotMessage]   = useState<string | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyOpen, setNearbyOpen]       = useState(false);
  const [userPos, setUserPos]           = useState<{ lat: number; lng: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGen = useRef(0);
  const inflightRef = useRef(0);
  const composingRef = useRef(false);
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    userPosRef.current = userPos;
  }, [userPos]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 300000, timeout: 8000 },
    );
  }, []);

  const fetchSuggestions = useCallback((v: string) => {
    if (timer.current) clearTimeout(timer.current);

    if (!v.trim() || !isSpotQueryReady(v)) {
      requestGen.current += 1;
      setSuggestions([]);
      setSuggestLoading(false);
      setSuggestFetched(false);
      return;
    }

    setSuggestFetched(false);

    timer.current = setTimeout(async () => {
      const gen = ++requestGen.current;
      inflightRef.current += 1;
      setSuggestLoading(true);
      try {
        const results = await fetchPostSpotSuggestions(v, gachaId, userPosRef.current);
        if (gen !== requestGen.current) return;
        setSuggestions(results);
        setSuggestFetched(true);
      } catch {
        if (gen !== requestGen.current) return;
        setSuggestions([]);
        setSuggestFetched(true);
      } finally {
        inflightRef.current = Math.max(0, inflightRef.current - 1);
        if (inflightRef.current === 0) setSuggestLoading(false);
      }
    }, SPOT_SUGGEST_DEBOUNCE_MS);
  }, [gachaId]);

  // 現在地取得後に距離順を再計算（query 変更時は handleQueryChange が担当）
  useEffect(() => {
    if (!isSpotQueryReady(query) || !userPos) return;
    fetchSuggestions(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos]);

  useEffect(() => {
    if (!focused || !query.trim()) return;
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
  }, [focused, query]);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setSpots([]);
    setSpotMessage(null);
    setNearbyOpen(false);
    if (!composingRef.current) fetchSuggestions(v);
  };

  const clearSearch = () => {
    if (timer.current) clearTimeout(timer.current);
    requestGen.current += 1;
    inflightRef.current = 0;
    setQuery('');
    setSuggestions([]);
    setSuggestLoading(false);
    setSuggestFetched(false);
    setSpots([]);
    setSpotMessage(null);
    setNearbyOpen(false);
  };

  const handleNearbyToggle = () => {
    if (nearbyOpen) {
      setNearbyOpen(false);
      setSpots([]);
      setSpotMessage(null);
      return;
    }

    setNearbyOpen(true);
    setNearbyLoading(true);
    setSpots([]);
    setSpotMessage(null);
    setQuery('');
    setSuggestions([]);
    setSuggestFetched(false);
    setFocused(false);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        try {
          const data = await fetch(
            `/api/spots/nearby?lat=${lat}&lng=${lng}&radius=5000&gachaId=${gachaId}`,
          ).then(r => r.json());
          const results: SpotResult[] = (data.spots ?? []).slice(0, 7).map(
            (s: { id: string; name: string; address: string; distance?: number }) => ({
              id: s.id, name: s.name, address: s.address, distance: s.distance,
            }),
          );
          if (results.length === 0) setSpotMessage('店舗が見つかりませんでした');
          else setSpots(results);
        } catch {
          setSpotMessage('取得に失敗しました');
        }
        setNearbyLoading(false);
      },
      () => { setSpotMessage('現在地の取得に失敗しました'); setNearbyLoading(false); },
      { maximumAge: 300000, timeout: 8000 },
    );
  };

  const showDrop = focused && isSpotQueryReady(query);
  const showLoadingSuggest = showDrop && suggestLoading && suggestions.length === 0;
  const showEmptySuggest = showDrop && suggestFetched && !suggestLoading && suggestions.length === 0;

  const chipBg = accentColor === '#F2B800' ? '#FFF8D0' : '#EFF6FF';
  const chipText = accentColor === '#F2B800' ? '#8A6800' : '#1D4ED8';

  return (
    <div style={{
      marginBottom: compactBottom ? 0 : (nearbyOpen ? POST_STEP_NEXT_GAP : POST_SPOT_STEP_NEXT_GAP),
    }}>
      {/* ガチャ名チップ */}
      <div style={{
        marginBottom: 14, padding: '8px 12px', background: chipBg, borderRadius: 10,
      }}>
        <span style={{
          display: 'block', fontSize: isMobile ? 11 : 12, fontWeight: 600, color: chipText,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {gachaName}
        </span>
      </div>

      {/* 検索バー（home/search と同じUI） */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: isMobile ? 8 : 10 }}>
        <div style={{ paddingTop: isMobile ? 6 : 8 }}>
          <div className="community-search-input-shell flex items-center gap-2 px-3 py-1.5 lg:py-2.5 rounded-full">
            {suggestLoading ? (
              <div className="animate-spin rounded-full border-2 border-t-transparent flex-shrink-0" style={{ width: 15, height: 15, borderColor: accentColor, borderTopColor: 'transparent' }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            )}
            <input
              type="text"
              value={query}
              placeholder="店舗・駅・都道府県・市区町村を検索"
              onChange={e => handleQueryChange(e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={e => {
                composingRef.current = false;
                handleQueryChange(e.currentTarget.value);
              }}
              onFocus={() => { setFocused(true); if (isSpotQueryReady(query)) fetchSuggestions(query); }}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              className="community-search-input shell-field flex-1 bg-transparent text-xs lg:text-sm outline-none min-w-0"
              style={{ fontSize: isMobile ? 12 : 14, textAlign: 'left' }}
            />
            {query && (
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  clearSearch();
                }}
                aria-label="入力をクリア"
                className="home-search-clear-btn p-0 bg-transparent border-none cursor-pointer leading-none flex-shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {showDrop && (showLoadingSuggest || showEmptySuggest || suggestions.length > 0) && (
          <div
            className="search-suggest-dropdown absolute z-50 left-0 right-0 rounded-xl shadow-xl"
            style={{ top: 'calc(100% - 4px)', maxHeight: 280, overflowY: 'auto' }}
          >
            {showLoadingSuggest ? (
              <p style={{ margin: 0, padding: isMobile ? '12px 12px' : '14px 12px', fontSize: isMobile ? 11 : 12, color: '#AAA', textAlign: 'center' }}>
                検索中…
              </p>
            ) : showEmptySuggest ? (
              <p style={{ margin: 0, padding: isMobile ? '12px 12px' : '14px 12px', fontSize: isMobile ? 11 : 12, color: '#AAA', textAlign: 'center' }}>
                店舗が見つかりませんでした
              </p>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s.id}
                  className="search-suggest-item block"
                  onMouseDown={e => {
                    e.preventDefault();
                    setQuery(s.name);
                    setSuggestions([]);
                    setSuggestFetched(false);
                    setFocused(false);
                    onSelect(s.id, s.name);
                  }}
                  style={{ padding: isMobile ? '8px 12px' : '10px 14px' }}
                >
                  <p className="search-suggest-label m-0 mb-0.5 truncate font-semibold" style={{ fontSize: isMobile ? 12 : 13 }}>
                    {s.name}
                  </p>
                  <p className="search-suggest-sublabel m-0 truncate" style={{ fontSize: isMobile ? 10 : 11 }}>
                    {s.address}
                    {s.distance != null && (
                      <span style={{ marginLeft: 6, fontWeight: 600, color: accentColor }}>
                        {fmtDist(s.distance)}
                      </span>
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 現在地ボタン（開閉トグル） */}
      <button
        type="button"
        onClick={handleNearbyToggle}
        disabled={nearbyLoading}
        className="post-card-border-btn flex items-center gap-1.5 w-full rounded-2xl active:scale-[0.99] transition-transform"
        style={{
          padding: isMobile ? '8px 12px' : '10px 14px',
          marginBottom: nearbyOpen ? 8 : 0,
          cursor: nearbyLoading ? 'default' : 'pointer',
          fontSize: isMobile ? 12 : 13,
        }}
      >
        <MapPin size={14} color={accentColor} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          {nearbyLoading ? '現在地を取得中…' : '現在地から近い店舗を表示'}
        </span>
        {!nearbyLoading && (nearbyOpen ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />)}
      </button>

      {nearbyOpen && spotMessage && !nearbyLoading && (
        <p style={{ textAlign: 'center', fontSize: isMobile ? 11 : 13, color: '#AAA', padding: '8px 0 12px', margin: 0 }}>
          {spotMessage}
        </p>
      )}

      {nearbyOpen && spots.length > 0 && (
        <div className="post-card-border-list rounded-2xl">
          {spots.map(sp => (
            <button
              key={sp.id}
              type="button"
              onClick={() => onSelect(sp.id, sp.name)}
              className="post-card-border-list-item"
              style={{ padding: isMobile ? '8px 12px' : '12px 14px' }}
            >
              <p
                className="spot-nearby-name m-0 mb-0.5 truncate font-semibold"
                style={{ fontSize: isMobile ? 12 : 13 }}
              >
                {sp.name}
              </p>
              <p
                className="spot-nearby-meta m-0 truncate"
                style={{ fontSize: isMobile ? 10 : 11 }}
              >
                {sp.address}
                {sp.distance != null && (
                  <span style={{ marginLeft: 6, fontWeight: 600, color: accentColor }}>
                    {fmtDist(sp.distance)}
                  </span>
                )}
              </p>
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
