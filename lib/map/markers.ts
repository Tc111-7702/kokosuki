import mapboxgl from 'mapbox-gl';
import type { SpotDetail, GachaInfo } from '@/components/SpotDetailSheet';

// マーカークリック後の dblclick 誤発火を防ぐフラグ
export let suppressDblclick = false;

const NEARBY_RADIUS = 20_000;

export interface NearbySpot {
  id: string; name: string; address: string;
  lat: number; lng: number; distance: number;
  phone?: string | null;
  gachaIds: string[]; googleMapsUrl: string | null;
  stockMap: Record<string, string>;
}

// ─── マーカー要素生成 ────────────────────────────────────────────────────────

export function createSpotMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:28px;height:36px;cursor:pointer;';
  const inner = document.createElement('div');
  inner.style.cssText = 'width:28px;height:36px;transition:transform 0.15s ease;transform-origin:center bottom;';
  inner.innerHTML = `<svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 22 14 22S28 23.63 28 14C28 6.27 21.73 0 14 0z" fill="#E53E3E"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;
  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.3)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  el.appendChild(inner);
  return el;
}

/** 検索でヒットした店舗の赤ピン（大きめ） */
export function createRedPinEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:36px;height:46px;cursor:pointer;';
  const inner = document.createElement('div');
  inner.style.cssText = 'width:36px;height:46px;';
  inner.innerHTML = `<svg viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 12.37 18 28 18 28S36 30.37 36 18C36 8.06 27.94 0 18 0z" fill="#E53E3E" stroke="white" stroke-width="2"/>
    <circle cx="18" cy="18" r="7" fill="white"/>
  </svg>`;
  el.appendChild(inner);
  return el;
}

export function createMarkerEl(imageUrl: string | null, ipName: string, borderColor = 'white', size = 44): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;`;
  let h = 0;
  for (let i = 0; i < ipName.length; i++) { h = ipName.charCodeAt(i) + ((h << 5) - h); }
  const hue = Math.abs(h) % 360;
  const inner = document.createElement('div');
  inner.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    border:${borderColor === 'white' ? '2.5px' : '3px'} solid ${borderColor};
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    overflow:hidden;
    background:linear-gradient(135deg,hsl(${hue},70%,60%),hsl(${(hue + 40) % 360},65%,45%));
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

// ─── ピン配置（API 呼び出し + 地図反映） ────────────────────────────────────

export async function loadNearbySpots(
  map: mapboxgl.Map,
  lat: number, lng: number,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>,
  filterGachaIds: string[],
  gachaMap: Map<string, GachaInfo>,
  onSpotClick: (spot: SpotDetail) => void,
  options?: { radius?: number; addressFilter?: string; ignoreFilter?: boolean },
) {
  try {
    const radius = options?.radius ?? NEARBY_RADIUS;
    const addressFilter = options?.addressFilter;
    let url = `/api/spots/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
    if (addressFilter) url += `&addressContains=${encodeURIComponent(addressFilter)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const { spots }: { spots: NearbySpot[] } = await res.json();

    // fetch完了後にマップが破棄されている場合はスキップ
    if (!map.getContainer().isConnected) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const ignoreFilter = options?.ignoreFilter === true;
    const visible = (ignoreFilter || filterGachaIds.length === 0)
      ? spots
      : spots.filter(s => s.gachaIds.some(id => filterGachaIds.includes(id)));

    for (const spot of visible) {
      const isUnfiltered = ignoreFilter || filterGachaIds.length === 0;
      const firstMatchId = isUnfiltered ? undefined : spot.gachaIds.find(id => filterGachaIds.includes(id));
      const firstGacha   = firstMatchId ? gachaMap.get(firstMatchId) : undefined;
      const el = isUnfiltered
        ? createSpotMarkerEl()
        : createMarkerEl(firstGacha?.imageUrl ?? null, firstGacha?.ipName ?? '');

      const popup = new mapboxgl.Popup({ offset: 28, closeButton: false, closeOnClick: false, maxWidth: '200px' })
        .setHTML(
          `<div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px;line-height:1.4;word-break:auto-phrase">${spot.name}</div>` +
          `<div style="font-size:11px;color:#888;margin-bottom:3px;line-height:1.4">${spot.address}</div>` +
          (firstGacha ? `<div style="font-size:11px;color:#F2B800;font-weight:600;line-height:1.4">${firstGacha.seriesName}</div>` : '')
        );

      const safeRemove = () => { try { popup.remove(); } catch {} };
      el.addEventListener('mouseenter', () => popup.setLngLat([spot.lng, spot.lat]).addTo(map));
      el.addEventListener('mouseleave', safeRemove);
      el.addEventListener('click', () => {
        suppressDblclick = true;
        setTimeout(() => { suppressDblclick = false; }, 600);
        safeRemove();
        map.flyTo({ center: [spot.lng, spot.lat], zoom: Math.max(map.getZoom(), 16), duration: 600 });
        onSpotClick({ id: spot.id, name: spot.name, address: spot.address, lat: spot.lat, lng: spot.lng, distance: spot.distance, phone: spot.phone, googleMapsUrl: spot.googleMapsUrl, gachaIds: spot.gachaIds, stockMap: spot.stockMap ?? {} });
      });

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([spot.lng, spot.lat]).addTo(map);
      markersRef.current.push(marker);
    }
  } catch (e) {
    console.warn('[Map] スポット取得失敗:', e);
  }
}

export async function loadSearchContentMarkers(
  map: mapboxgl.Map,
  lat: number, lng: number,
  contentGachaIds: string[],
  gachaMap: Map<string, GachaInfo>,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>,
  onSpotClick: (spot: SpotDetail, overrideIds: string[]) => void,
  options?: { radius?: number; addressFilter?: string },
): Promise<number> {
  const radius = options?.radius ?? NEARBY_RADIUS;
  const addressFilter = options?.addressFilter;
  let url = `/api/spots/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
  if (addressFilter) url += `&addressContains=${encodeURIComponent(addressFilter)}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const { spots }: { spots: NearbySpot[] } = await res.json();

  markersRef.current.forEach(m => m.remove());
  markersRef.current = [];

  const contentSet = new Set(contentGachaIds);
  const matched = spots.filter(s => s.gachaIds.some(id => contentSet.has(id)));

  for (const spot of matched) {
    const firstMatchId = spot.gachaIds.find(id => contentSet.has(id));
    const firstGacha   = firstMatchId ? gachaMap.get(firstMatchId) : undefined;
    const el = createMarkerEl(firstGacha?.imageUrl ?? null, firstGacha?.ipName ?? '', '#F2B800', 52);

    el.addEventListener('click', () => {
      suppressDblclick = true;
      setTimeout(() => { suppressDblclick = false; }, 600);
      onSpotClick(
        { id: spot.id, name: spot.name, address: spot.address, lat: spot.lat, lng: spot.lng, distance: spot.distance, phone: spot.phone, googleMapsUrl: spot.googleMapsUrl, gachaIds: spot.gachaIds, stockMap: spot.stockMap ?? {} },
        contentGachaIds,
      );
    });

    const marker = new mapboxgl.Marker({