'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart } from 'lucide-react';
import type { GachaDetail, NearbySpot } from '@/components/gacha-types';
import { NearbyButton } from '@/components/NearbyButton';
import { LineupSection } from '@/components/LineupSection';
import { StatCard } from '@/components/ui/StatCard';

const STATUS_LABEL: Record<string, string> = {
  on_sale: '発売中', coming_soon: '発売予定', ended: '終了',
};
const KIND_LABEL: Record<string, string> = {
  gacha: 'ガチャ', kuji: 'くじ', capsule: 'カプセル', other: 'その他',
};

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
