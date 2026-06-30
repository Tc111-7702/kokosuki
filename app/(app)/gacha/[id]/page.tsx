'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MapPin, Bell } from 'lucide-react';

type Gacha = {
  id: string; seriesName: string; ipName: string; kind: string;
  status: string; price: number; gradientFrom: string; gradientTo: string;
  lineup: string[]; imageUrl: string | null; releaseDate: string | null;
};

type Spot = {
  id: string; name: string; address: string; lat: number; lng: number; distance: number;
  stockMap: Record<string, string>;
};

const STATUS_LABEL: Record<string, string> = { on_sale: '発売中', coming_soon: '発売予定', ended: '終了' };
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  on_sale:     { bg: '#E8F5E9', text: '#2E7D32' },
  coming_soon: { bg: '#EEF2FF', text: '#4F46E5' },
  ended:       { bg: '#EEEEEE', text: '#757575' },
};
const STOCK_LABEL: Record<string, { label: string; color: string }> = {
  in_stock:      { label: '在庫あり', color: '#22C55E' },
  out_of_stock:  { label: '在庫なし', color: '#EF4444' },
  not_available: { label: '取扱なし', color: '#A8A29E' },
};

interface NearbyButtonProps {
  spot: Spot;
  gachaId: string;
  onMapOpen: (url: string) => void;
}
function NearbyButton({ spot, gachaId, onMapOpen }: NearbyButtonProps) {
  const mapUrl = `/map?spotId=${spot.id}`;
  const stock  = spot.stockMap[gachaId];
  const sc     = stock ? STOCK_LABEL[stock] : null;
  const dist   = spot.distance < 1000
    ? `${Math.round(spot.distance)}m`
    : `${(spot.distance / 1000).toFixed(1)}km`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: 'white', borderRadius: 14, border: '1.5px solid #EDE9D8',
      boxShadow: '0 2px 0 #E5E1CE' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: 0, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: '#AAA' }}>{dist}</span>
          {sc && (
            <span style={{ fontSize: 10, fontWeight: 700, color: sc.color }}>
              &#9679; {sc.label}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onMapOpen(mapUrl)}
        style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10,
          background: '#F5F3ED', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <MapPin size={16} color="#555" />
      </button>
    </div>
  );
}

export default function GachaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gacha, setGacha]   = useState<Gacha | null>(null);
  const [spots, setSpots]   = useState<Spot[]>([]);
  const [liked, setLiked]   = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gacha/${id}`)
      .then(r => r.json())
      .then(d => { setGacha(d.gacha ?? null); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`/api/gacha/${id}/like`)
      .then(r => r.json())
      .then(d => { setLiked(d.liked ?? false); setLikeCount(d.count ?? 0); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!gacha) return;
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      fetch(`/api/spots/nearby?lat=${lat}&lng=${lng}&gachaIds=${gacha.id}&limit=5`)
        .then(r => r.json())
        .then(d => setSpots(d.spots ?? []))
        .catch(() => {});
    });
  }, [gacha]);

  const toggleLike = async () => {
    const res = await fetch(`/api/gacha/${id}/like`, { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      setLiked(d.liked ?? !liked);
      setLikeCount(d.count ?? likeCount);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: '#BBB', fontSize: 13, fontWeight: 700 }}>読み込み中…</div>
  );
  if (!gacha) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12 }}>
      <p style={{ fontSize: 14, color: '#AAA' }}>ガチャが見つかりませんでした</p>
      <button onClick={() => router.back()} style={{ fontSize: 13, fontWeight: 700,
        color: '#F2B800', background: 'none', border: 'none', cursor: 'pointer' }}>戻る</button>
    </div>
  );

  const st = STATUS_STYLE[gacha.status] ?? STATUS_STYLE.ended;
  const stLabel = gacha.releaseDate
    ? `${new Date(gacha.releaseDate).getMonth() + 1}/${new Date(gacha.releaseDate).getDate()}発売予定`
    : STATUS_LABEL[gacha.status] ?? gacha.status;
  const isComingSoon = gacha.status === 'coming_soon';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto',
      background: '#FFFEEF' }}>

      <div style={{ position: 'relative', flexShrink: 0, height: 260,
        background: `linear-gradient(150deg, ${gacha.gradientFrom} 0%, ${gacha.gradientTo} 100%)` }}>
        {gacha.imageUrl && (
          <img src={gacha.imageUrl} alt={gacha.seriesName}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center' }} />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', padding: '24px 16px 12px' }}>
          <button onClick={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="white" />
          </button>
          <button onClick={toggleLike}
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: liked ? 'rgba(255,77,77,0.85)' : 'rgba(0,0,0,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 200ms' }}>
            <Heart size={18} fill={liked ? 'white' : 'none'} color="white" />
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '48px 20px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.52), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800,
              background: st.bg, color: st.text }}>{stLabel}</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', margin: '0 0 4px' }}>
            {gacha.ipName}
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>
            {gacha.seriesName}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', borderRadius: 16, overflow: 'hidden',
          background: 'white', border: '1.5px solid #EDE9D8', boxShadow: '0 3px 0 #E5E1CE' }}>
          {[
            { label: '1回', value: `¥${gacha.price}` },
            { label: 'いいね', value: likeCount },
            { label: 'ラインナップ', value: gacha.lineup.length > 0 ? `${gacha.lineup.length}種` : '—' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '14px 8px',
              borderLeft: i > 0 ? '1px solid #EDE9D8' : 'none' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: 0, lineHeight: 1 }}>
                {s.value}
              </p>
              <p style={{ fontSize: 9, color: '#AAA', fontWeight: 700, margin: '4px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {isComingSoon ? (
          <button onClick={toggleLike}
            style={{ width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer',
              background: liked ? '#FFCD31' : 'white',
              color: liked ? '#7A4E00' : '#92620A',
              border: liked ? '1.5px solid #FFCD31' : '1.5px solid #FFCD31',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontSize: 14, fontWeight: 900, transition: 'background 200ms' }}>
            <Bell size={16} />
            {liked ? '通知オン中' : '発売をお知らせ'}
          </button>
        ) : (
          <button onClick={() => router.push('/map')}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#FFCD31', color: '#7A4E00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontSize: 14, fontWeight: 900 }}>
            <MapPin size={16} />
            マップで近くのお店を探す
          </button>
        )}

        {gacha.lineup.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: '0 0 10px' }}>
              ラインナップ
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {gacha.lineup.map(name => (
                <span key={name} style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12,
                  fontWeight: 700, background: 'white', color: '#555',
                  border: '1.5px solid #EDE9D8' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {spots.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: '0 0 10px' }}>
              近くのお店
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {spots.map(spot => (
                <NearbyButton
                  key={spot.id}
                  spot={spot}
                  gachaId={gacha.id}
                  onMapOpen={(url) => router.push(url)}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
