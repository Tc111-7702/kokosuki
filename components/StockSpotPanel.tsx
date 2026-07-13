'use client';

import { useState, useEffect } from 'react';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

// 在庫報告専用：現在地500m以内 & gachaId一致のスポットのみ表示
const STOCK_RADIUS = 500; // メートル

interface SpotResult {
  id: string;
  name: string;
  address: string;
  distance: number;
}

function fmtDist(d: number): string {
  return d < 1000 ? Math.round(d) + 'm' : (d / 1000).toFixed(1) + 'km';
}

export function StockSpotPanel({
  gachaId,
  gachaName,
  gachaImageUrl,
  onSelect,
}: {
  gachaId: string;
  gachaName: string;
  gachaImageUrl: string | null;
  onSelect: (id: string, name: string) => void;
}) {
  const [state, setState] = useState<'locating' | 'loading' | 'done' | 'geo-error' | 'denied'>('locating');
  const [spots, setSpots] = useState<SpotResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setState('locating');
    setSpots([]);
    setMessage(null);

    if (!navigator.geolocation) {
      setState('geo-error');
      setMessage('このブラウザは位置情報に対応していません');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        setState('loading');
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `/api/spots/nearby?lat=${lat}&lng=${lng}&radius=${STOCK_RADIUS}&gachaId=${gachaId}`
          );
          const data = await res.json();
          const results: SpotResult[] = (data.spots ?? []).map(
            (s: { id: string; name: string; address: string; distance?: number }) => ({
              id: s.id, name: s.name, address: s.address, distance: s.distance ?? 0,
            })
          );
          setSpots(results);
          if (results.length === 0) {
            setMessage(`現在地から${STOCK_RADIUS}m以内に「${gachaName}」を取り扱う店舗がありません`);
          }
        } catch {
          setMessage('店舗情報の取得に失敗しました');
        }
        setState('done');
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          setState('denied');
          setMessage('位置情報の使用が拒否されました。ブラウザの設定から許可してください。');
        } else {
          setState('geo-error');
          setMessage('現在地の取得に失敗しました。もう一度お試しください。');
        }
      },
      { maximumAge: 30000, timeout: 10000 }
    );
  };

  // gachaId が確定したタイミングで GPS+検索を開始
  useEffect(() => { if (gachaId) load(); }, [gachaId]);

  // ── ローディング中 ──────────────────────────────────────────────
  if (state === 'locating' || state === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{
          width: 24, height: 24, margin: '0 auto 12px',
          border: '3px solid #60A5FA', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
          {state === 'locating' ? '現在地を取得中…' : '近くの店舗を検索中…'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── エラー ─────────────────────────────────────────────────────
  if (state === 'geo-error' || state === 'denied') {
    return (
      <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: 12, textAlign: 'center' }}>
        <AlertCircle size={20} color="#EF4444" style={{ margin: '0 auto 8px' }} />
        <p style={{ fontSize: 13, color: '#DC2626', margin: '0 0 12px', lineHeight: 1.5 }}>{message}</p>
        {state === 'geo-error' && (
          <button onClick={load}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#EF4444', color: 'white', fontSize: 13,
              fontWeight: 700, cursor: 'pointer',
            }}>
            <RefreshCw size={13} />再試行
          </button>
        )}
      </div>
    );
  }

  // ── 結果なし ──────────────────────────────────────────────────
  if (state === 'done' && spots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <MapPin size={20} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 4px', lineHeight: 1.5 }}>{message}</p>
        <p style={{ fontSize: 11, color: '#C4C4C4', margin: 0 }}>
          ※ 在庫報告は現在地{STOCK_RADIUS}m以内の店舗のみ対象です
        </p>
        <button onClick={load}
          style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '1.5px solid #D1D5DB',
            background: 'white', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
          <RefreshCw size={13} />再検索
        </button>
      </div>
    );
  }

  // ── 店舗リスト ────────────────────────────────────────────────
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        padding: '6px 10px', background: '#EFF6FF', borderRadius: 8,
      }}>
        <MapPin size={12} color="#3B82F6" />
        <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>
          現在地{STOCK_RADIUS}m以内 &middot; {gachaName}取扱店舗
        </span>
        <button onClick={load}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <RefreshCw size={12} color="#93C5FD" />
        </button>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid #F0EDDF', overflow: 'hidden' }}>
        {spots.map((sp, i) => (
          <button key={sp.id} onClick={() => onSelect(sp.id, sp.name)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: i < spots.length - 1 ? '1px solid #F0EDDF' : 'none',
              background: 'white', cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F0F9FF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{sp.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#999' }}>
              {sp.address}
              <span style={{ marginLeft: 6, fontWeight: 700, color: '#60A5FA' }}>
                {fmtDist(sp.distance)}
              </span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
