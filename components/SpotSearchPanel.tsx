'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';

// ─── 型 ────────────────────────────────────────────────────────────────

interface SpotResult {
  id: string;
  name: string;
  address: string;
  distance?: number;
}

interface Suggestion {
  type: 'spot' | 'station' | 'area';
  label: string;
  sublabel?: string;
  spotId?: string;
  lat?: number;
  lng?: number;
}

// ─── ユーティリティ ────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(d?: number): string {
  if (d == null) return '';
  return d < 1000 ? Math.round(d) + 'm' : (d / 1000).toFixed(1) + 'km';
}

// ─── メインコンポーネント ─────────────────────────────────────────────

export function SpotSearchPanel({
  gachaId,
  gachaName,
  gachaImageUrl,
  accentColor = '#F2B800',
  onSelect,
}: {
  gachaId: string;
  gachaName: string;
  gachaImageUrl: string | null;
  accentColor?: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery]           = useState('');
  const [focused, setFocused]       = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [spots, setSpots]           = useState<SpotResult[]>([]);
  const [spotMessage, setSpotMessage] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [userPos, setUserPos]       = useState<{ lat: number; lng: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 現在地を先取得しておく（ソートに使用）
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 300000, timeout: 8000 },
    );
  }, []);

  // ── オートコンプリート ────────────────────────────────────────────

  const fetchSuggestions = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const [stationRes, areaRes, spotRes] = await Promise.all([
          fetch(`/api/station-suggest?q=${encodeURIComponent(v)}`).then(r => r.json()),
          fetch(`/api/area-suggest?q=${encodeURIComponent(v)}`).then(r => r.json()),
          fetch(`/api/spots/search?name=${encodeURIComponent(v)}&suggest=1${gachaId ? '&gachaId=' + gachaId : ''}`).then(r => r.json()),
        ]);

        const merged: Suggestion[] = [
          ...(stationRes.suggestions ?? []).slice(0, 5).map((s: { label: string; sublabel?: string; lat: number; lng: number }) => ({
            type: 'station' as const, label: s.label, sublabel: s.sublabel, lat: s.lat, lng: s.lng,
          })),
          ...(areaRes.suggestions ?? []).slice(0, 4).map((s: { label: string; sublabel?: string }) => ({
            type: 'area' as const, label: s.label, sublabel: s.sublabel,
          })),
          ...(spotRes.suggestions ?? []).slice(0, 5).map((s: { id: string; name: string; address: string }) => ({
            type: 'spot' as const, label: s.name, sublabel: s.address, spotId: s.id,
          })),
        ];
        setSuggestions(merged);
      } catch { /* silent */ }
    }, 200);
  };

  // ── 現在地ボタン ────────────────────────────────────────────────────

  const handleNearby = () => {
    setNearbyLoading(true);
    setSpots([]);
    setSpotMessage(null);
    setQuery('');
    setSuggestions([]);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        try {
          const data = await fetch(
            `/api/spots/nearby?lat=${lat}&lng=${lng}&radius=5000&gachaId=${gachaId}`
          ).then(r => r.json());
          const results: SpotResult[] = (data.spots ?? []).slice(0, 7).map(
            (s: { id: string; name: string; address: string; distance?: number }) => ({
              id: s.id, name: s.name, address: s.address, distance: s.distance,
            })
          );
          if (results.length === 0) setSpotMessage('店舗情報がありません');
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

  // ── サジェスト選択 ──────────────────────────────────────────────────

  const handleSelectSuggestion = async (s: Suggestion) => {
    setQuery(s.label);
    setSuggestions([]);
    setFocused(false);
    setSpotMessage(null);

    // 店舗をそのまま選択
    if (s.type === 'spot' && s.spotId) {
      onSelect(s.spotId, s.label);
      return;
    }

    setLoading(true);
    setSpots([]);

    try {
      if (s.type === 'station' && s.lat != null && s.lng != null) {
        // 駅から 2km 以内の全店舗
        const data = await fetch(
          `/api/spots/nearby?lat=${s.lat}&lng=${s.lng}&radius=2000${gachaId ? '&gachaId=' + gachaId : ''}`
        ).then(r => r.json());
        const results: SpotResult[] = (data.spots ?? []).map(
          (sp: { id: string; name: string; address: string; distance?: number }) => ({
            id: sp.id, name: sp.name, address: sp.address, distance: sp.distance,
          })
        );
        if (results.length === 0) setSpotMessage('店舗情報がありません');
        else setSpots(results);

      } else if (s.type === 'area') {
        // 都道府県 or 市区町村 → 住所に含まれる店舗を近い順
        const params = new URLSearchParams({ name: s.label, suggest: '1' });
        if (userPos) {
          params.set('lat', String(userPos.lat));
          params.set('lng', String(userPos.lng));
        }
        if (gachaId) params.set('gachaId', gachaId);
        const data = await fetch(`/api/spots/search?${params}`).then(r => r.json());
        type RawSpot = { id: string; name: string; address: string; lat?: number; lng?: number; distance?: number };
        let results: SpotResult[] = (data.suggestions ?? []).map((sp: RawSpot) => ({
          id: sp.id,
          name: sp.name,
          address: sp.address,
          distance: sp.distance ?? (userPos && sp.lat && sp.lng
            ? Math.round(haversine(userPos.lat, userPos.lng, sp.lat, sp.lng))
            : undefined),
        }));
        if (userPos) results = results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        if (results.length === 0) setSpotMessage('店舗情報がありません');
        else setSpots(results);
      }
    } catch {
      setSpotMessage('店舗情報がありません');
    }

    setLoading(false);
  };

  const typeIcon = (type: Suggestion['type']) =>
    type === 'station' ? '🚉' : type === 'area' ? '🗾' : '🏪';

  const chipBg = accentColor === '#F2B800' ? '#FFF8D0' : '#EFF6FF';
  const chipText = accentColor === '#F2B800' ? '#8A6800' : '#1D4ED8';

  return (
    <div>
      {/* ガチャ画像チップ */}
      <div style={{
        marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', background: chipBg, borderRadius: 10,
      }}>
        {gachaImageUrl ? (
          <img
            src={gachaImageUrl}
            alt={gachaName}
            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: accentColor + '33', flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: 13, fontWeight: 600, color: chipText,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {gachaName}
        </span>
      </div>

      {/* 現在地ボタン */}
      <button
        onClick={handleNearby}
        disabled={nearbyLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '10px 14px', marginBottom: 10, borderRadius: 12,
          background: '#F5F3ED', border: 'none', cursor: nearbyLoading ? 'default' : 'pointer',
          fontSize: 13, color: '#555',
        }}
      >
        <MapPin size={14} color={accentColor} />
        {nearbyLoading ? '現在地を取得中…' : '現在地から近い店舗を表示'}
      </button>

      {/* スマート検索バー */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: '#F5F3ED', borderRadius: 12,
          border: focused ? `1.5px solid ${accentColor}` : '1.5px solid transparent',
          transition: 'border-color 0.15s',
        }}>
          <Search size={14} color="#aaa" />
          <input
            type="text"
            value={query}
            placeholder="店舗・駅・都道府県・市区町村を検索"
            onChange={e => { setQuery(e.target.value); fetchSuggestions(e.target.value); setSpots([]); setSpotMessage(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#333' }}
          />
          {query ? (
            <button
              onMouseDown={e => {
                e.preventDefault();
                setQuery(''); setSuggestions([]); setSpots([]); setSpotMessage(null);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} color="#bbb" />
            </button>
          ) : null}
        </div>

        {/* オートコンプリートドロップダウン */}
        {focused && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            border: '1px solid #f0f0f0', maxHeight: 280, overflowY: 'auto',
          }}>
            {suggestions.map((s, i) => (
              <button
                key={`${s.type}-${s.label}-${i}`}
                onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{typeIcon(s.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </p>
                    {s.sublabel && (
                      <p style={{ margin: 0, fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.sublabel}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ローディングスピナー */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            width: 20, height: 20, margin: '0 auto',
            border: `2px solid ${accentColor}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      )}

      {/* 「店舗情報がありません」メッセージ */}
      {spotMessage && !loading && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#AAA', padding: '12px 0', margin: 0 }}>
          {spotMessage}
        </p>
      )}

      {/* 店舗リスト */}
      {spots.length > 0 && !loading && (
        <div style={{ borderRadius: 12, border: '1px solid #F0EDDF', overflow: 'hidden' }}>
          {spots.map((sp, i) => (
            <button
              key={sp.id}
              onClick={() => onSelect(sp.id, sp.name)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 14px',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: i < spots.length - 1 ? '1px solid #F0EDDF' : 'none',
                background: 'white', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFBF0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
            >
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{sp.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#999' }}>
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
