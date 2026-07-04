'use client';

import { Phone, MapPin } from 'lucide-react';
import type { GachaDetail, NearbySpot } from '@/components/gacha-types';

export function NearbyButton({ gacha, alwaysOpen, nearbyOpen, nearbyLoading, nearbyError, nearbySpots, onToggle, onSpotClick, isMobile }: {
  gacha: GachaDetail; alwaysOpen?: boolean; nearbyOpen: boolean; nearbyLoading: boolean;
  nearbyError: string | null; nearbySpots: NearbySpot[]; onToggle: () => void;
  onSpotClick: (spotId: string) => void; isMobile: boolean;
}) {
  const isOpen = alwaysOpen || nearbyOpen;
  return (
    <div>
      <button
        onClick={alwaysOpen ? undefined : onToggle}
        style={{
          width: '100%', padding: '12px 0', border: 'none',
          borderRadius: isOpen ? '14px 14px 0 0' : 14,
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
          border: '1.5px solid ' + gacha.gradientFrom + '44', borderTop: 'none',
          borderRadius: '0 0 14px 14px', background: '#fff', overflow: 'hidden',
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
              onClick={isMobile ? () => onSpotClick(spot.id) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                borderTop: i > 0 ? '1px solid #F0F0F0' : 'none',
                cursor: isMobile ? 'pointer' : 'default',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {spot.name}
                  </p>
                  {!isMobile && (
                    <button
                      onClick={() => onSpotClick(spot.id)}
                      style={{
                        flexShrink: 0, width: 32, height: 32, borderRadius: 16,
                        background: gacha.gradientFrom + '22', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                      title="地図で見る"
                    >
                      <MapPin size={17} color={gacha.gradientFrom} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 11, color: '#999', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {spot.address}
                  {spot.distance != null && (
                    <span style={{ marginLeft: 6, color: gacha.gradientFrom, fontWeight: 600 }}>
                      {spot.distance < 1000 ? Math.round(spot.distance) + 'm' : (spot.distance / 1000).toFixed(1) + 'km'}
                    </span>
                  )}
                </p>
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
