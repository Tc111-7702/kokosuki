'use client';

import { useSyncExternalStore } from 'react';
import { Phone } from 'lucide-react';
import type { GachaDetail, NearbySpot } from '@/components/gacha-types';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

export function NearbyButton({ gacha, alwaysOpen, nearbyOpen, nearbyLoading, nearbyError, nearbySpots, onToggle, onSpotClick, isMobile }: {
  gacha: GachaDetail; alwaysOpen?: boolean; nearbyOpen: boolean; nearbyLoading: boolean;
  nearbyError: string | null; nearbySpots: NearbySpot[]; onToggle: () => void;
  onSpotClick: (spotId: string) => void; isMobile: boolean;
}) {
  const isOpen = alwaysOpen || nearbyOpen;
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const shellBorder = isDark ? '#262626' : '#e5e7eb';

  return (
    <div style={isOpen ? { border: `1px solid ${shellBorder}`, borderRadius: 14, overflow: 'hidden' } : undefined}>
      <button
        onClick={alwaysOpen ? undefined : onToggle}
        style={{
          width: '100%', padding: '12px 0', border: 'none',
          borderRadius: isOpen ? 0 : 14,
          background: 'linear-gradient(135deg, ' + gacha.gradientFrom + ', ' + gacha.gradientTo + ')',
          color: '#fff', fontWeight: 800, fontSize: 15,
          cursor: alwaysOpen ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: isOpen ? 'none' : '0 4px 16px ' + gacha.gradientFrom + '55',
          letterSpacing: '0.04em',
        }}
      >
        <span>&#128205;</span> 近くにある？
        {!alwaysOpen && <span style={{ marginLeft: 4, fontSize: 12, opacity: 0.8 }}>{nearbyOpen ? '▲' : '▼'}</span>}
      </button>
      {isOpen && (
        <div style={{
          borderTop: `1px solid ${shellBorder}`,
          background: '#fff', overflow: 'hidden',
        }}>
          {nearbyLoading && (
            <p style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#999' }}>
              現在地を取得中…
            </p>
          )}
          {nearbyError && (
            <p style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#E53E3E' }}>{nearbyError}</p>
          )}
          {!nearbyLoading && !nearbyError && nearbySpots.length === 0 && (
            <p style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#AAA' }}>
              近くに店舗が見つかりませんでした
            </p>
          )}
          {nearbySpots.slice(0, 7).map((spot, i) => (
            <div
              key={spot.id}
              onClick={() => onSpotClick(spot.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '9px 16px' : '12px 16px',
                borderTop: i > 0 ? `1px solid ${shellBorder}` : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: isDark ? '#FFFFFF' : '#1A1A1A', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {spot.name}
                </p>
                {(!isMobile || spot.distance != null) && (
                  <p style={{ fontSize: 11, color: isMobile ? gacha.gradientFrom : '#999', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isMobile ? 600 : undefined }}>
                    {!isMobile && spot.address}
                    {spot.distance != null && (
                      <span style={{ marginLeft: isMobile ? 0 : 6, color: gacha.gradientFrom, fontWeight: 600 }}>
                        {spot.distance < 1000 ? Math.round(spot.distance) + 'm' : (spot.distance / 1000).toFixed(1) + 'km'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {spot.phone && (
                <a
                  href={'tel:' + spot.phone}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: 17,
                    background: '#22C55E', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', textDecoration: 'none',
                  }}
                >
                  <Phone size={16} color="white" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
