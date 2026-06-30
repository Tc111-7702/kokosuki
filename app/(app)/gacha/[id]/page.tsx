'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Phone, MapPin } from 'lucide-react';

interface GachaDetail {
  id: string; seriesName: string; ipName: string; kind: string; category: string;
  status: string; price: number; gradientFrom: string; gradientTo: string;
  lineup: string[] | null; imageUrl: string | null;
  commentCount: number; weeklyPulls: number; postCount: number;
  isCollab: boolean; isReissue: boolean; isContinuation: boolean;
  genre: string | null; releaseDate: string | null; maker: string | null; sourceUrl: string | null;
}

interface NearbySpot {
  id: string; name: string; address: string; distance: number;
  phone: string | null; gachaIds: string[]; stockMap: Record<string, string>;
}

const STATUS_LABEL: Record<string, string> = {
  on_sale: '発売中', coming_soon: '発売予定', ended: '終了',
};
const KIND_LABEL: Record<string, string> = {
  gacha: 'ガチャ', kuji: 'くじ', capsule: 'カプセル', other: 'その他',
};

function NearbyButton({ gacha, alwaysOpen, nearbyOpen, nearbyLoading, nearbyError, nearbySpots, onToggle, onSpotClick, isMobile }: {
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

function LineupSection({ gacha }: { gacha: GachaDetail }) {
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 800, color: '#555', marginBottom: 10, letterSpacing: '0.05em' }}>
        ほしい物を選ぶ
      </p>
      {gacha.lineup && gacha.lineup.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {gacha.lineup.map((item) => (
            <button key={item} style={{
              padding: '7px 14px', borderRadius: 20, border: '1.5px solid #E5E5E5',
              background: '#fff', fontSize: 13, fontWeight: 600, color: '#333',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = gacha.gradientFrom; e.currentTarget.style.color = gacha.gradientFrom; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#333'; }}
            >{item}</button>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#AAA', fontStyle: 'italic' }}>
          ラインアップ不明
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '10px 12px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center',
    }}>
      <p style={{ fontSize: 18, fontWeight: 900, margin: '0 0 2px', color: accent ?? '#1A1A1A' }}>{value}</p>
      <p style={{ fontSize: 10, color: '#AAA', fontWeight: 600, margin: 0, letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

export default function GachaDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [gacha,         setGacha]         = useState<GachaDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [imgRatio,      setImgRatio]      = useState(1);
  const [liked,         setLiked]         = useState(false);
  const [likeCount,     setLikeCount]     = useState(0);
  const [nearbyOpen,    setNearbyOpen]    = useState(false);
  const [nearbySpots,   setNearbySpots]   = useState<NearbySpot[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError,   setNearbyError]   = useState<string | null>(null);
  const [isMobile,      setIsMobile]      = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    fetch('/api/gacha/' + id)
      .then((r) => r.json())
      .then((d) => setGacha(d.gacha))
      .finally(() => setLoading(false));
    fetch('/api/gacha/' + id + '/like')
      .then((r) => r.json())
      .then((d) => { setLiked(!!d.liked); setLikeCount(d.count ?? 0); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (isMobile) return;
    doFetchNearby();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const doFetchNearby = () => {
    if (nearbySpots.length > 0) return;
    setNearbyLoading(true);
    setNearbyError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch('/api/spots/nearby?lat=' + coords.latitude + '&lng=' + coords.longitude + '&radius=20000&gachaId=' + id);
          const d = await r.json();
          setNearbySpots(d.spots ?? []);
        } catch {
          setNearbyError('取得に失敗しました');
        } finally {
          setNearbyLoading(false);
        }
      },
      () => { setNearbyError('位置情報を取得できませんでした'); setNearbyLoading(false); }
    );
  };

  const handleNearby = () => {
    if (nearbyOpen) { setNearbyOpen(false); return; }
    setNearbyOpen(true);
    doFetchNearby();
  };

  const handleLike = async () => {
    const res = await fetch('/api/gacha/' + id + '/like', { method: 'POST' });
    if (!res.ok) return;
    const d = await res.json();
    setLiked(!!d.liked);
    setLikeCount(d.count ?? likeCount);
  };

  const handleSpotClick = (spotId: string) => {
    router.push('/map?spotId=' + spotId + '&highlightGachaId=' + id);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#FFFEEF' }}>
      <p style={{ color: '#C8780A', fontWeight: 700, fontSize: 14 }}>読み込み中...</p>
    </div>
  );

  if (!gacha) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#FFFEEF' }}>
      <p style={{ color: '#999', fontSize: 14 }}>ガチャが見つかりません</p>
    </div>
  );

  const cardW       = 540;
  const imgH        = Math.round(cardW * imgRatio);
  const statusColor = gacha.status === 'on_sale' ? '#22C55E' : gacha.status === 'coming_soon' ? '#F59E0B' : '#9CA3AF';

  const tags = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusColor, color: '#fff' }}>
        {STATUS_LABEL[gacha.status] ?? gacha.status}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.07)', color: '#555' }}>
        {KIND_LABEL[gacha.kind] ?? gacha.kind}
      </span>
      {gacha.isCollab       && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#EDE9FE', color: '#7C3AED' }}>コラボ</span>}
      {gacha.isReissue      && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEF3C7', color: '#D97706' }}>再販</span>}
      {gacha.isContinuation && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>続編</span>}
    </div>
  );

  const titleBlock = (size: number) => (
    <div>
      <p style={{ fontSize: 12, color: '#999', fontWeight: 600, margin: '0 0 4px' }}>{gacha.ipName}</p>
      <h1 style={{ fontSize: size, fontWeight: 900, color: '#1A1A1A', margin: 0, lineHeight: 1.3 }}>{gacha.seriesName}</h1>
    </div>
  );

  return (
    <div style={{ height: '100%', background: '#FFFEEF', overflowY: 'auto' }}>

      {/* topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,254,239,0.92)', backdropFilter: 'blur(8px)',
      }}>
        <button onClick={() => router.back()} style={{
          width: 36, height: 36, borderRadius: 18, border: 'none',
          background: 'rgba(0,0,0,0.07)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowLeft size={18} color="#555" />
        </button>
        <button onClick={handleLike} style={{
          height: 36, borderRadius: 18, border: 'none', padding: '0 12px',
          background: liked ? 'rgba(255,77,77,0.12)' : 'rgba(0,0,0,0.07)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Heart size={18} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : '#555'} />
          {likeCount > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: liked ? '#FF4D4D' : '#555' }}>{likeCount}</span>}
        </button>
      </div>

      {isMobile ? (
        <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', background: 'linear-gradient(135deg, ' + gacha.gradientFrom + ', ' + gacha.gradientTo + ')' }}>
            {gacha.imageUrl
              ? <img src={gacha.imageUrl} alt={gacha.seriesName} onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth > 0) setImgRatio(img.naturalHeight / img.naturalWidth); }} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 48 }}>&#127920;</span></div>
            }
          </div>
          {tags}
          {titleBlock(22)}
          <NearbyButton gacha={gacha} nearbyOpen={nearbyOpen} nearbyLoading={nearbyLoading} nearbyError={nearbyError} nearbySpots={nearbySpots} onToggle={handleNearby} onSpotClick={handleSpotClick} isMobile={true} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatCard label="1回の価格" value={'¥' + gacha.price} accent="#F2B800" />
            <StatCard label="みんなの投稿" value={String(gacha.postCount)} />
            <StatCard label="今週引いた" value={String(gacha.weeklyPulls)} />
          </div>
          <LineupSection gacha={gacha} />
        </div>
      ) : (
        <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
            <div style={{ width: cardW, flexShrink: 0, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', background: 'linear-gradient(135deg, ' + gacha.gradientFrom + ', ' + gacha.gradientTo + ')', minHeight: 320 }}>
              {gacha.imageUrl
                ? <img src={gacha.imageUrl} alt={gacha.seriesName} onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth > 0) setImgRatio(img.naturalHeight / img.naturalWidth); }} style={{ width: '100%', height: imgH || 'auto', objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 48 }}>&#127920;</span></div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 240, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tags}
              {titleBlock(24)}
              <NearbyButton gacha={gacha} alwaysOpen nearbyOpen={nearbyOpen} nearbyLoading={nearbyLoading} nearbyError={nearbyError} nearbySpots={nearbySpots} onToggle={handleNearby} onSpotClick={handleSpotClick} isMobile={false} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <StatCard label="1回の価格" value={'¥' + gacha.price} accent="#F2B800" />
              <StatCard label="みんなの投稿" value={String(gacha.postCount)} />
              <StatCard label="今週引いた" value={String(gacha.weeklyPulls)} />
            </div>
            <LineupSection gacha={gacha} />
          </div>
        </div>
      )}
    </div>
  );
}
