'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [spots, setSpots]               = useState<SpotResult[]>([]);
  const [spotMessage, setSpotMessage]   = useState<string | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyOpen, setNearbyOpen]       = useState(false);
  const [userPos, setUserPos]           = useState<{ lat: number; lng: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 300000, timeout: 8000 },
    );
  }, []);

  // 現在地取得後に距離順を再計算
  useEffect(() => {
    if (!query.trim() || !userPos) return;
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

  const fetchSuggestions = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setSuggestions([]); setSuggestLoading(false); return; }
    setSuggestLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const results = await fetchPostSpotSuggestions(v, gachaId, userPos);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 200);
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

  const showDrop = focused && query.trim().length > 0;
  const showEmptySuggest = showDrop && !suggestLoading && suggestions.length === 0;

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

      {/* 検索バー */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: isMobile ? 8 : 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isMobile ? '6px 12px' : '8px 12px',
          background: '#F5F3ED', borderRadius: 12,
        }}>
          <Search size={14} color="#aaa" />
          <input
            type="text"
            value={query}
            placeholder="店舗・駅・都道府県・市区町村を検索"
            onChange={e => {
              setQuery(e.target.value);
              fetchSuggestions(e.target.value);
              setSpots([]);
              setSpotMessage(null);
              setNearbyOpen(false);
            }}
            onFocus={() => { setFocused(true); if (query) fetchSuggestions(query); }}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: isMobile ? 12 : 13, color: '#333' }}
          />
          {query ? (
            <button
              onMouseDown={e => {
                e.preventDefault();
                setQuery(''); setSuggestions([]); setSpots([]); setSpotMessage(null); setNearbyOpen(false);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} color="#bbb" />
            </button>
          ) : null}
        </div>

        {showDrop && (
          <div style={{
            position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            border: '1px solid #f0f0f0', maxHeight: 280, overflowY: 'auto',
          }}>
            {suggestLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 18, height: 18, margin: '0 auto',
                  border: `2px solid ${accentColor}`, borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            ) : showEmptySuggest ? (
              <p style={{ margin: 0, padding: isMobile ? '12px 12px' : '14px 12px', fontSize: isMobile ? 11 : 12, color: '#AAA', textAlign: 'center' }}>
                店舗が見つかりませんでした
              </p>
            ) : (
              suggestions.map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={e => {
                    e.preventDefault();
                    setQuery(s.name);
                    setSuggestions([]);
                    setFocused(false);
                    onSelect(s.id, s.name);
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: isMobile ? '8px 12px' : '10px 14px',
                    borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <p style={{ margin: '0 0 2px', fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </p>
                  <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        onClick={handleNearbyToggle}
        disabled={nearbyLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: isMobile ? '6px 12px' : '8px 14px', marginBottom: nearbyOpen ? 8 : 0, borderRadius: 12,
          background: '#F5F3ED', border: 'none', cursor: nearbyLoading ? 'default' : 'pointer',
          fontSize: isMobile ? 12 : 13, color: '#555',
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
        <div style={{ borderRadius: 12, border: '1px solid #F0EDDF', overflow: 'hidden' }}>
          {spots.map((sp, i) => (
            <button
              key={sp.id}
              onClick={() => onSelect(sp.id, sp.name)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: isMobile ? '8px 12px' : '12px 14px',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: i < spots.length - 1 ? '1px solid #F0EDDF' : 'none',
                background: 'white', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFBF0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
            >
              <p style={{ margin: '0 0 2px', fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</p>
              <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
