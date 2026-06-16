'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { List, Navigation, SlidersHorizontal } from 'lucide-react';
import FilterDrawer, { loadStoredGachaIds } from '@/components/feature/FilterDrawer';
import SpotDetailSheet, { type SpotDetail, type GachaInfo } from '@/components/feature/SpotDetailSheet';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const NEARBY_RADIUS = 20000;
const STORAGE_KEY = 'mikke_filter_gacha_ids';

interface NearbySpot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  gachaIds: string[];
  googleMapsUrl: string | null;
}

function createMarkerEl(imageUrl: string | null, ipName: string): HTMLElement {
  // Mapbox は el の transform を位置決めに使うので、
  // ホバーアニメーションは inner div に閉じ込める
  const el = document.createElement('div');
  el.style.cssText = 'width:44px;height:44px;cursor:pointer;';

  let h = 0;
  for (let i = 0; i < ipName.length; i++) { h = ipName.charCodeAt(i) + ((h << 5) - h); }
  const hue = Math.abs(h) % 360;

  const inner = document.createElement('div');
  inner.style.cssText = `
    width:44px;height:44px;border-radius:50%;
    border:2.5px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    overflow:hidden;
    background:linear-gradient(135deg,hsl(${hue},70%,60%),hsl(${(hue+40)%360},65%,45%));
    transition:transform 0.15s ease, box-shadow 0.15s ease;
    transform-origin:center center;
  `;

  el.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.45)';
    inner.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
  });
  el.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)';
    inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  });

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    img.onerror = () => { img.style.display = 'none'; };
    inner.appendChild(img);
  }
  el.appendChild(inner);
  return el;
}

async function loadNearbySpots(
  map: mapboxgl.Map,
  lat: number,
  lng: number,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>,
  filterGachaIds: string[],
  gachaMap: Map<string, GachaInfo>,
  onSpotClick: (spot: SpotDetail) => void,
) {
  try {
    const res = await fetch(`/api/spots/nearby?lat=${lat}&lng=${lng}&radius=${NEARBY_RADIUS}`);
    if (!res.ok) return;
    const { spots }: { spots: NearbySpot[] } = await res.json();

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visible = filterGachaIds.length === 0
      ? spots
      : spots.filter((s) => s.gachaIds.some((id) => filterGachaIds.includes(id)));

    for (const spot of visible) {
      const firstMatchId = spot.gachaIds.find((id) =>
        filterGachaIds.length === 0 || filterGachaIds.includes(id)
      );
      const firstGacha = firstMatchId ? gachaMap.get(firstMatchId) : undefined;
      const el = createMarkerEl(firstGacha?.imageUrl ?? null, firstGacha?.ipName ?? '');

      // ホバーツールチップ
      const popup = new mapboxgl.Popup({
        offset: 28,
        closeButton: false,
        closeOnClick: false,
        maxWidth: '200px',
      }).setHTML(
        `<div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px;line-height:1.4;word-break:auto-phrase">${spot.name}</div>` +
        `<div style="font-size:11px;color:#888;margin-bottom:3px;line-height:1.4">${spot.address}</div>` +
        (firstGacha ? `<div style="font-size:11px;color:#F2B800;font-weight:600;line-height:1.4">${firstGacha.seriesName}</div>` : ''),
      );

      el.addEventListener('mouseenter', () => popup.setLngLat([spot.lng, spot.lat]).addTo(map));
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', () => {
        popup.remove();
        onSpotClick({
          id: spot.id,
          name: spot.name,
          address: spot.address,
          distance: spot.distance,
          googleMapsUrl: spot.googleMapsUrl,
          gachaIds: spot.gachaIds,
        });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      markersRef.current.push(marker);
    }

    console.log(`[Map] ${visible.length}/${spots.length} 件表示`);
  } catch (e) {
    console.warn('[Map] スポット取得失敗:', e);
  }
}

export default function MapPage() {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<mapboxgl.Map | null>(null);
  const spotMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const currentPosRef  = useRef<{ lat: number; lng: number } | null>(null);
  const filterRef      = useRef<string[]>([]);
  const gachaMapRef    = useRef<Map<string, GachaInfo>>(new Map());

  const [favoriteIps, setFavoriteIps]       = useState<string[]>([]);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [filterGachaIds, setFilterGachaIds] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot]     = useState<SpotDetail | null>(null);

  filterRef.current = filterGachaIds;

  // 初期化
  useEffect(() => {
    const stored = loadStoredGachaIds();

    fetch('/api/gacha/filters')
      .then((r) => r.json())
      .then(({ items }: { items: GachaInfo[] }) => {
        const map = new Map<string, GachaInfo>();
        items.forEach((g) => map.set(g.id, g));
        gachaMapRef.current = map;

        if (stored.length > 0) {
          setFilterGachaIds(stored);
          filterRef.current = stored;
          return;
        }

        fetch('/api/profile/me')
          .then((r) => r.json())
          .then((profile) => {
            const favIps: string[] = Array.isArray(profile.favoriteIps) ? profile.favoriteIps : [];
            setFavoriteIps(favIps);
            if (favIps.length > 0) {
              const favIds = items.filter((g) => favIps.includes(g.ipName)).map((g) => g.id);
              if (favIds.length > 0) {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(favIds)); } catch {}
                setFilterGachaIds(favIds);
                filterRef.current = favIds;
              }
            }
          });
      });

    fetch('/api/profile/me')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.favoriteIps)) setFavoriteIps(data.favoriteIps); })
      .catch(() => {});
  }, []);

  // Mapbox初期化
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.6917, 35.6895],
      zoom: 14,
      language: 'ja',
    });
    mapRef.current = map;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mapRef.current) return;
        const { longitude, latitude } = pos.coords;
        currentPosRef.current = { lat: latitude, lng: longitude };
        mapRef.current.setCenter([longitude, latitude]);
        new mapboxgl.Marker({ color: '#F2B800' })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);
        loadNearbySpots(mapRef.current, latitude, longitude, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
      },
      (err) => console.warn('位置情報取得失敗:', err),
      { enableHighAccuracy: true },
    );

    return () => {
      spotMarkersRef.current.forEach((m) => m.remove());
      spotMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const goToCurrentLocation = useCallback(() => {
    if (!mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mapRef.current) return;
        const { longitude, latitude } = pos.coords;
        currentPosRef.current = { lat: latitude, lng: longitude };
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15, speed: 1.4 });
        loadNearbySpots(mapRef.current, latitude, longitude, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
      },
      (err) => console.warn('位置情報取得失敗:', err),
      { enableHighAccuracy: true },
    );
  }, []);

  const handleFilterApply = useCallback((ids: string[]) => {
    setFilterGachaIds(ids);
    filterRef.current = ids;
    if (mapRef.current && currentPosRef.current) {
      const { lat, lng } = currentPosRef.current;
      loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, ids, gachaMapRef.current, setSelectedSpot);
    }
  }, []);

  const isFiltered = filterGachaIds.length > 0;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-shrink-0 z-10">
        <div
          className="flex flex-col gap-2 pt-4 pb-3"
          style={{ background: 'white', borderRadius: '0 0 20px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.10)' }}
        >
          <div className="flex items-center justify-between px-4">
            <h1 className="text-[22px] font-black" style={{ color: '#F2B800' }}>マップ</h1>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold"
                style={{ background: '#F5F3ED', color: '#555' }}
              >
                <List size={14} />リスト
              </button>
              <button
                onClick={goToCurrentLocation}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: '#F2B800' }}
              >
                <Navigation size={16} color="white" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4">
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-transform"
              style={{ background: isFiltered ? '#F2B800' : '#F5F3ED', color: isFiltered ? 'white' : '#888' }}
            >
              <SlidersHorizontal size={13} />
              {isFiltered ? `フィルター中 (${filterGachaIds.length})` : 'フィルター'}
            </button>
            {isFiltered && (
              <button
                onClick={() => handleFilterApply([])}
                className="text-[12px] px-3 py-1.5 rounded-full"
                style={{ background: '#FFF0C0', color: '#B8860B' }}
              >
                解除
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0" />

      <FilterDrawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleFilterApply}
        favoriteIps={favoriteIps}
        currentGachaIds={filterGachaIds}
      />

      <SpotDetailSheet
        spot={selectedSpot}
        gachaMap={gachaMapRef.current}
        filterGachaIds={filterGachaIds}
        onClose={() => setSelectedSpot(null)}
      />
    </div>
  );
}
