'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { List, Navigation, SlidersHorizontal, MapPin } from 'lucide-react';
import FilterDrawer, { loadStoredGachaIds } from '@/components/feature/FilterDrawer';
import SpotDetailSheet, { type SpotDetail, type GachaInfo } from '@/components/feature/SpotDetailSheet';
import SearchBar from '@/components/feature/SearchBar';

// accessToken は page.tsx から props 経由で受け取る（下記 MapClient を参照）

// ─── 都道府県庁所在地 ─────────────────────────────────────────────────────────
const PREF_CAPITALS: Record<string, string> = {
  '北海道':'札幌市','青森県':'青森市','岩手県':'盛岡市','宮城県':'仙台市','秋田県':'秋田市',
  '山形県':'山形市','福島県':'福島市','茨城県':'水戸市','栃木県':'宇都宮市','群馬県':'前橋市',
  '埼玉県':'さいたま市','千葉県':'千葉市','東京都':'新宿区','神奈川県':'横浜市','新潟県':'新潟市',
  '富山県':'富山市','石川県':'金沢市','福井県':'福井市','山梨県':'甲府市','長野県':'長野市',
  '岐阜県':'岐阜市','静岡県':'静岡市','愛知県':'名古屋市','三重県':'津市','滋賀県':'大津市',
  '京都府':'京都市','大阪府':'大阪市','兵庫県':'神戸市','奈良県':'奈良市','和歌山県':'和歌山市',
  '鳥取県':'鳥取市','島根県':'松江市','岡山県':'岡山市','広島県':'広島市','山口県':'山口市',
  '徳島県':'徳島市','香川県':'高松市','愛媛県':'松山市','高知県':'高知市','福岡県':'福岡市',
  '佐賀県':'佐賀市','長崎県':'長崎市','熊本県':'熊本市','大分県':'大分市','宮崎県':'宮崎市',
  '鹿児島県':'鹿児島市','沖縄県':'那覇市',
};


// マーカークリック後の dblclick 誤発火を防ぐフラグ
let suppressDblclick = false;

const NEARBY_RADIUS = 20000;
const STORAGE_KEY   = 'mikke_filter_gacha_ids';

interface NearbySpot {
  id: string; name: string; address: string;
  lat: number; lng: number; distance: number;
  phone?: string | null;
  gachaIds: string[]; googleMapsUrl: string | null;
  stockMap: Record<string, string>;
}

// ─── マーカー生成ヘルパー ─────────────────────────────────────────────────────

function createSpotMarkerEl(): HTMLElement {
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
function createRedPinEl(): HTMLElement {
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

function createMarkerEl(imageUrl: string | null, ipName: string, borderColor = 'white', size = 44): HTMLElement {
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

// ─── フィルターマーカー読み込み ───────────────────────────────────────────────

async function loadNearbySpots(
  map: mapboxgl.Map,
  lat: number, lng: number,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>,
  filterGachaIds: string[],
  gachaMap: Map<string, GachaInfo>,
  onSpotClick: (spot: SpotDetail) => void,
  options?: { radius?: number; addressFilter?: string },
) {
  try {
    const radius = options?.radius ?? NEARBY_RADIUS;
    const addressFilter = options?.addressFilter;
    let url = `/api/spots/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
    if (addressFilter) url += `&addressContains=${encodeURIComponent(addressFilter)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const { spots }: { spots: NearbySpot[] } = await res.json();

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 住所/駅検索時はフィルター無視してすべて表示
    const ignoreFilter = !!addressFilter || !!options?.radius;
    const visible = (ignoreFilter || filterGachaIds.length === 0)
      ? spots
      : spots.filter(s => s.gachaIds.some(id => filterGachaIds.includes(id)));

    for (const spot of visible) {
      const isUnfiltered  = ignoreFilter || filterGachaIds.length === 0;
      const firstMatchId  = isUnfiltered ? undefined : spot.gachaIds.find(id => filterGachaIds.includes(id));
      const firstGacha    = firstMatchId ? gachaMap.get(firstMatchId) : undefined;
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

// ─── 検索コンテンツマーカー読み込み（黄色枠） ───────────────────────────────

async function loadSearchContentMarkers(
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

    const marker = new mapboxgl.Marker({ element: el }).setLngLat([spot.lng, spot.lat]).addTo(map);
    markersRef.current.push(marker);
  }

  return matched.length;
}

// ─── 駅範囲サークル GeoJSON ────────────────────────────────────────────────────


function makeCircleGeoJSON(lng: number, lat: number, radiusM: number) {
  const n = 64; const R = 6378137;
  const coords: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const ang = (i / n) * 2 * Math.PI;
    coords.push([
      lng + (radiusM / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI) * Math.cos(ang),
      lat + (radiusM / R) * (180 / Math.PI) * Math.sin(ang),
    ]);
  }
  return { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [coords] }, properties: {} };
}

// ─── 逆ジオコーディング ──────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${mapboxgl.accessToken}&language=ja&limit=1&types=address,place,locality`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const ctx      = feature.context ?? [];
    const locality = ctx.find((c: { id: string; text: string }) => c.id.startsWith('locality'));
    const place    = ctx.find((c: { id: string; text: string }) => c.id.startsWith('place'));
    const region   = ctx.find((c: { id: string; text: string }) => c.id.startsWith('region'));
    // 市＋区 両方あれば連結（例: 堺市中区、大阪市北区）
    const cityPart = [place?.text, locality?.text].filter(Boolean).join('');
    if (cityPart && region) return `${region.text} ${cityPart}`;
    if (cityPart) return cityPart;
    return feature.place_name?.split(',').slice(0, 2).join('') ?? null;
  } catch {
    return null;
  }
}

// ─── MapClient ───────────────────────────────────────────────────────────────

interface MapClientProps {
  mapboxToken: string;
}

export default function MapClient({ mapboxToken }: MapClientProps) {
  mapboxgl.accessToken = mapboxToken;
  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<mapboxgl.Map | null>(null);
  const spotMarkersRef   = useRef<mapboxgl.Marker[]>([]);
  const searchMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const searchPinRef     = useRef<mapboxgl.Marker | null>(null);
  const currentPosRef    = useRef<{ lat: number; lng: number } | null>(null);
  const tempSearchPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentPinRef    = useRef<mapboxgl.Marker | null>(null);
  const filterRef        = useRef<string[]>([]);
  const gachaMapRef      = useRef<Map<string, GachaInfo>>(new Map());

  const [favoriteIps, setFavoriteIps]             = useState<string[]>([]);
  const [filterOpen, setFilterOpen]               = useState(false);
  const [filterGachaIds, setFilterGachaIds]       = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot]           = useState<SpotDetail | null>(null);
  const [searchOverrideIds, setSearchOverrideIds] = useState<string[] | null>(null);
  const [hasSearchResult, setHasSearchResult]     = useState(false);
  const [currentAddress, setCurrentAddress]       = useState<string | null>(null);

  filterRef.current = filterGachaIds;

  const [zoom, setZoom] = useState(14);
  const panTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const PAN_STEP    = 80;

  const startPan = useCallback((dx: number, dy: number) => {
    if (!mapRef.current) return;
    mapRef.current.panBy([dx, dy], { duration: 100 });
    panTimerRef.current = setInterval(() => { mapRef.current?.panBy([dx, dy], { duration: 100 }); }, 120);
  }, []);

  const stopPan = useCallback(() => {
    if (panTimerRef.current) { clearInterval(panTimerRef.current); panTimerRef.current = null; }
  }, []);

  // 検索結果クリア
  const clearSearchResults = useCallback(() => {
    searchMarkersRef.current.forEach(m => m.remove());
    searchMarkersRef.current = [];
    searchPinRef.current?.remove();
    searchPinRef.current = null;
    setSearchOverrideIds(null);
    setHasSearchResult(false);
  }, []);

  // 赤ピン設置
  const placeSearchPin = useCallback((map: mapboxgl.Map, lat: number, lng: number) => {
    searchPinRef.current?.remove();
    const el = createRedPinEl();
    searchPinRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map);
  }, []);

  // 検索ハンドラ（8パターン）
  const handleSearch = useCallback(async (locationQuery: string, contentQuery: string, coords?: { lat: number; lng: number }) => {
    if (!locationQuery.trim() && !contentQuery.trim()) return;
    if (!mapRef.current) return;

    clearSearchResults();
    setHasSearchResult(true);

    const currentPos = currentPosRef.current;

    // ── 位置情報解決 ──
    let resolvedSpot: SpotDetail | null = null;
    let resolvedPos: { lat: number; lng: number } | null = null;
    let resolvedGeoAddress: string = locationQuery;
    let searchLocationType: 'station' | 'city' | 'prefecture' | 'address' | null = null;
    let addressFilterText: string | null = null;

    if (locationQuery.trim()) {
      const lat = currentPos?.lat ?? 0;
      const lng = currentPos?.lng ?? 0;
      const res  = await fetch(`/api/spots/search?name=${encodeURIComponent(locationQuery)}&lat=${lat}&lng=${lng}`);
      const data = await res.json();

      if (data.spot) {
        resolvedSpot = data.spot as SpotDetail;
      } else if (coords) {
        // 駅サジェストから直接座標が渡された場合
        resolvedPos = coords;
        searchLocationType = 'station';
        const addr = await reverseGeocode(coords.lat, coords.lng);
        if (addr) resolvedGeoAddress = addr;
      } else {
        // 駅名なら先にステーションAPIを試みる
        if (/駅/.test(locationQuery.trim())) {
          try {
            const stRes = await fetch(`/api/station-suggest?q=${encodeURIComponent(locationQuery.trim())}`);
            const stData = await stRes.json();
            const first = stData.suggestions?.[0];
            if (first) {
              resolvedPos = { lat: first.lat, lng: first.lng };
              searchLocationType = 'station';
              const addr = await reverseGeocode(first.lat, first.lng);
              resolvedGeoAddress = addr ? `${first.label}（${addr}）` : first.label;
            }
          } catch {}
        }
        // 位置が未解決ならMapbox geocodingにフォールバック
        if (!resolvedPos) {
        try {
          const geoRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json` +
            `?access_token=${mapboxgl.accessToken}&country=JP&language=ja&limit=1`
          );
          const geoData = await geoRes.json();
          if (geoData.features?.[0]) {
            const feat = geoData.features[0];
            const [glng, glat] = feat.center;
            resolvedPos = { lat: glat, lng: glng };
            // コンテキストから都道府県+市区町村を抽出
            const ctx      = feat.context ?? [];
            const lc = ctx.find((c: { id: string; text: string }) => c.id.startsWith('locality'));
            const pl = ctx.find((c: { id: string; text: string }) => c.id.startsWith('place'));
            const rg = ctx.find((c: { id: string; text: string }) => c.id.startsWith('region'));
            const featIsPlace  = (feat.place_type as string[])?.some(t => t === 'place' || t === 'locality' || t === 'district');
            const featIsRegion = (feat.place_type as string[])?.some(t => t === 'region');
            if (featIsPlace && rg) {
              // feat自体が市区町村: place型なら市そのもの、locality/district型なら区→ctx.plが親市
              const isFeatCity = (feat.place_type as string[]).includes('place');
              const prefixCity = !isFeatCity && pl ? pl.text : '';
              const displayCity = `${prefixCity}${feat.text}`;
              resolvedGeoAddress = `${rg.text} ${displayCity}`;
              searchLocationType = 'city';
              addressFilterText = displayCity; // 例: "堺市中区", "大阪市北区", "神戸市"
            } else if (featIsRegion) {
              // 都道府県を検索した場合
              const capital = PREF_CAPITALS[feat.text as string];
              resolvedGeoAddress = capital ? `${feat.text} ${capital}` : feat.text;
              searchLocationType = 'prefecture';
              addressFilterText = feat.text;
            } else if (rg) {
              // 市＋区を連結（例: 堺市中区）
              const cityPart = [pl?.text, lc?.text].filter(Boolean).join('');
              if (cityPart) {
                resolvedGeoAddress = `${rg.text} ${cityPart}`;
                searchLocationType = 'city';
                addressFilterText = cityPart;
              } else {
                const capital = PREF_CAPITALS[rg.text as string];
                resolvedGeoAddress = capital ? `${rg.text} ${capital}` : rg.text;
                searchLocationType = 'prefecture';
                addressFilterText = rg.text;
              }
            } else {
              resolvedGeoAddress = feat.place_name?.split(',')[0] ?? locationQuery;
              searchLocationType = 'address';
            }
          }
        } catch {}
        } // if (!resolvedPos)
      } // else
    }

    // ── コンテンツ解決 ──
    let contentResult: { type: string; gachaIds: string[]; label: string } | null = null;
    if (contentQuery.trim()) {
      const res  = await fetch(`/api/gacha/search?q=${encodeURIComponent(contentQuery)}`);
      const data = await res.json();
      if (data.type) contentResult = data;
    }

    const map = mapRef.current;

    // ── ケース分岐 ──

    if (resolvedSpot && !contentResult) {
      // ケース1: 店舗名のみ
      placeSearchPin(map, resolvedSpot.lat, resolvedSpot.lng);
      currentPinRef.current?.setLngLat([resolvedSpot.lng, resolvedSpot.lat]);
      setCurrentAddress(resolvedSpot.name);
      map.flyTo({ center: [resolvedSpot.lng, resolvedSpot.lat], zoom: 17, duration: 1000 });
      setSelectedSpot(resolvedSpot);

    } else if (resolvedSpot && contentResult) {
      // ケース5・6: 店舗名 + コンテンツ
      placeSearchPin(map, resolvedSpot.lat, resolvedSpot.lng);
      currentPinRef.current?.setLngLat([resolvedSpot.lng, resolvedSpot.lat]);
      setCurrentAddress(resolvedSpot.name);
      map.flyTo({ center: [resolvedSpot.lng, resolvedSpot.lat], zoom: 17, duration: 1000 });
      setSearchOverrideIds(contentResult.gachaIds);
      setSelectedSpot(resolvedSpot);

    } else if (resolvedPos && !contentResult) {
      // ケース2: 住所/駅
      tempSearchPosRef.current = resolvedPos;
      const isStation = searchLocationType === 'station';
      const STATION_RADIUS = 5000;
      if (isStation) {
        if (currentPinRef.current) {
          currentPinRef.current.setLngLat([resolvedPos.lng, resolvedPos.lat]);
        } else {
          currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' }).setLngLat([resolvedPos.lng, resolvedPos.lat]).addTo(map);
        }
        (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData(makeCircleGeoJSON(resolvedPos.lng, resolvedPos.lat, STATION_RADIUS));
      } else {
        currentPinRef.current?.remove();
        currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
          .setLngLat([resolvedPos.lng, resolvedPos.lat]).addTo(map);
        (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
      }
      setCurrentAddress(resolvedGeoAddress);
      map.flyTo({ center: [resolvedPos.lng, resolvedPos.lat], zoom: isStation ? 14 : 13, duration: 1000 });
      loadNearbySpots(map, resolvedPos.lat, resolvedPos.lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
        isStation
          ? { radius: STATION_RADIUS }
          : { radius: 200000, addressFilter: addressFilterText ?? undefined }
      );

    } else if (!locationQuery.trim() && contentResult) {
      // ケース3・4: コンテンツのみ（現在地 or 仮位置）
      const pos = tempSearchPosRef.current ?? currentPosRef.current;
      if (pos) {
        await loadSearchContentMarkers(map, pos.lat, pos.lng, contentResult.gachaIds, gachaMapRef.current, searchMarkersRef,
          (spot, overrideIds) => { setSearchOverrideIds(overrideIds); setSelectedSpot(spot); }
        );
      }

    } else if (resolvedPos && contentResult) {
      // ケース7・8: 住所 + コンテンツ
      tempSearchPosRef.current = resolvedPos;
      // 住所のみ検索で表示していた通常ピンを消す
      spotMarkersRef.current.forEach(m => m.remove());
      spotMarkersRef.current = [];
      const isStation78 = searchLocationType === 'station';
      const STATION_RADIUS = 5000;
      if (isStation78) {
        if (currentPinRef.current) {
          currentPinRef.current.setLngLat([resolvedPos.lng, resolvedPos.lat]);
        } else {
          currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' }).setLngLat([resolvedPos.lng, resolvedPos.lat]).addTo(map);
        }
        (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData(makeCircleGeoJSON(resolvedPos.lng, resolvedPos.lat, STATION_RADIUS));
      } else {
        currentPinRef.current?.remove();
        currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
          .setLngLat([resolvedPos.lng, resolvedPos.lat]).addTo(map);
        (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
      }
      setCurrentAddress(resolvedGeoAddress);
      map.flyTo({ center: [resolvedPos.lng, resolvedPos.lat], zoom: isStation78 ? 14 : 13, duration: 1000 });
      await loadSearchContentMarkers(map, resolvedPos.lat, resolvedPos.lng, contentResult.gachaIds, gachaMapRef.current, searchMarkersRef,
        (spot, overrideIds) => { setSearchOverrideIds(overrideIds); setSelectedSpot(spot); },
        isStation78
          ? { radius: STATION_RADIUS }
          : { radius: 200000, addressFilter: addressFilterText ?? undefined }
      );
    }
  }, [clearSearchResults, placeSearchPin]);

  // 検索クリア
  const handleSearchClear = useCallback(() => {
    clearSearchResults();
    setSelectedSpot(null);
    // ピンと住所を元の現在地に戻す
    if (currentPosRef.current && mapRef.current) {
      const { lat, lng } = currentPosRef.current;
      currentPinRef.current?.remove();
      currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
        .setLngLat([lng, lat]).addTo(mapRef.current);
      (mapRef.current.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
      reverseGeocode(lat, lng).then(addr => { if (addr) setCurrentAddress(addr); });
    }
    if (tempSearchPosRef.current && currentPosRef.current && mapRef.current) {
      tempSearchPosRef.current = null;
      const { lat, lng } = currentPosRef.current;
      loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
    }
  }, [clearSearchResults]);

  // 初期化
  useEffect(() => {
    const stored = loadStoredGachaIds();
    if (stored.length > 0) { setFilterGachaIds(stored); filterRef.current = stored; }
    fetch('/api/gacha/filters')
      .then(r => r.json())
      .then(({ items }: { items: GachaInfo[] }) => {
        const map = new Map<string, GachaInfo>();
        items.forEach(g => map.set(g.id, g));
        gachaMapRef.current = map;
        if (currentPosRef.current && mapRef.current) {
          const { lat, lng } = currentPosRef.current;
          loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, filterRef.current, map, setSelectedSpot);
        }
        fetch('/api/profile/me').then(r => r.json()).then(profile => {
          const favIps: string[] = Array.isArray(profile.favoriteIps) ? profile.favoriteIps : [];
          setFavoriteIps(favIps);
          if (stored.length > 0) {
            const favIds = items.filter(g => favIps.includes(g.ipName)).map(g => g.id);
            const merged = Array.from(new Set([...stored, ...favIds]));
            if (merged.length !== stored.length) {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
              setFilterGachaIds(merged); filterRef.current = merged;
            } else { setFilterGachaIds(stored); filterRef.current = stored; }
            return;
          }
          if (favIps.length > 0) {
            const favIds = items.filter(g => favIps.includes(g.ipName)).map(g => g.id);
            if (favIds.length > 0) {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(favIds)); } catch {}
              setFilterGachaIds(favIds); filterRef.current = favIds;
            }
          }
        });
      });
    fetch('/api/profile/me').then(r => r.json()).then(d => { if (Array.isArray(d.favoriteIps)) setFavoriteIps(d.favoriteIps); }).catch(() => {});
  }, []);

  // Mapbox初期化
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.6917, 35.6895],
      zoom: 14, language: 'ja',
    });
    mapRef.current = map;
    map.on('zoom', () => setZoom(Math.round(map.getZoom() * 2) / 2));

    // ダブルクリックで現在地ピンを移動＋住所更新
    map.on('dblclick', (e) => {
      if (suppressDblclick) return;
      const { lat, lng } = e.lngLat;
      currentPosRef.current = { lat, lng };
      if (currentPinRef.current) {
        currentPinRef.current.setLngLat([lng, lat]);
      } else {
        currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
      (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
      reverseGeocode(lat, lng).then(addr => { if (addr) setCurrentAddress(addr); });
    });

    // 駅アイコンクリックで現在地を移動＋「駅名（都道府県市区町村）」表示
    const moveToStation = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const stationName: string = feature.properties?.name ?? feature.properties?.name_ja ?? '';
      if (!stationName) return;
      const geom = feature.geometry as { type: string; coordinates: number[] };
      if (geom.type !== 'Point') return;
      const [lng, lat] = geom.coordinates;
      currentPosRef.current = { lat, lng };
      if (currentPinRef.current) {
        currentPinRef.current.setLngLat([lng, lat]);
      } else {
        currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' }).setLngLat([lng, lat]).addTo(map);
      }
      (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData(makeCircleGeoJSON(lng, lat, NEARBY_RADIUS));
      map.flyTo({ center: [lng, lat], zoom: Math.max(mapRef.current?.getZoom() ?? 14, 15), duration: 800 });
      reverseGeocode(lat, lng).then(addr => {
        setCurrentAddress(addr ? `${stationName}駅（${addr}）` : `${stationName}駅`);
      });
      loadNearbySpots(map, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
    };

    // スタイル読み込み後にレイヤーへのクリック＋ホバー膨張を登録
    map.on('load', () => {
      const TRANSIT_SOURCE_LAYER = 'transit_stop_label';
      let hoveredStationId: number | string | undefined;

      // 駅選択時の範囲サークルレイヤー
      map.addSource('station-range', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'station-range-fill', type: 'fill', source: 'station-range',
        paint: { 'fill-color': '#F2B800', 'fill-opacity': 0.07 } });
      map.addLayer({ id: 'station-range-line', type: 'line', source: 'station-range',
        paint: { 'line-color': '#F2B800', 'line-width': 2, 'line-opacity': 0.55, 'line-dasharray': [5, 3] } });

      if (map.getLayer('transit-label')) {
        // ホバー時に黄色リングを表示するcircleレイヤー（paintプロパティはfeature-state対応）
        map.addLayer({
          id: 'transit-hover-ring',
          type: 'circle',
          source: 'composite',
          'source-layer': TRANSIT_SOURCE_LAYER,
          paint: {
            'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 18, 0],
            'circle-color': 'rgba(242,184,0,0.18)',
            'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0],
            'circle-stroke-color': '#F2B800',
            'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
          },
        }, 'transit-label');

        map.on('mouseenter', 'transit-label', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const f = e.features?.[0];
          if (f?.id !== undefined) {
            if (hoveredStationId !== undefined) {
              map.removeFeatureState({ source: 'composite', sourceLayer: TRANSIT_SOURCE_LAYER, id: hoveredStationId });
            }
            hoveredStationId = f.id as number | string;
            map.setFeatureState({ source: 'composite', sourceLayer: TRANSIT_SOURCE_LAYER, id: hoveredStationId }, { hover: true });
          }
        });

        map.on('mouseleave', 'transit-label', () => {
          map.getCanvas().style.cursor = '';
          if (hoveredStationId !== undefined) {
            map.removeFeatureState({ source: 'composite', sourceLayer: TRANSIT_SOURCE_LAYER, id: hoveredStationId });
            hoveredStationId = undefined;
          }
        });

        map.on('click', 'transit-label', moveToStation);
      }

      // poi-labelは鉄道・バス・フェリー系のみ対応（一般POIクリックとの誤反応を防ぐ）
      if (map.getLayer('poi-label')) {
        const TRANSIT_MAKI = new Set(['rail', 'rail-metro', 'rail-light', 'bus', 'ferry', 'airport', 'bicycle-share']);
        map.on('click', 'poi-label', (e) => {
          const maki: string = e.features?.[0]?.properties?.maki ?? '';
          if (!TRANSIT_MAKI.has(maki)) return;
          moveToStation(e);
        });
        map.on('mouseenter', 'poi-label', (e) => {
          const maki: string = e.features?.[0]?.properties?.maki ?? '';
          if (TRANSIT_MAKI.has(maki)) map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'poi-label', () => { map.getCanvas().style.cursor = ''; });
      }
    });

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (!mapRef.current) return;
        const { longitude, latitude } = pos.coords;
        currentPosRef.current = { lat: latitude, lng: longitude };
        mapRef.current.setCenter([longitude, latitude]);
        if (currentPinRef.current) {
          currentPinRef.current.setLngLat([longitude, latitude]);
        } else {
          currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);
        }
        reverseGeocode(latitude, longitude).then(addr => { if (addr) setCurrentAddress(addr); });
        loadNearbySpots(mapRef.current, latitude, longitude, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
      },
      err => console.warn('位置情報取得失敗:', err),
      { enableHighAccuracy: true },
    );

    return () => {
      spotMarkersRef.current.forEach(m => m.remove());
      spotMarkersRef.current = [];
      searchMarkersRef.current.forEach(m => m.remove());
      searchMarkersRef.current = [];
      currentPinRef.current?.remove(); currentPinRef.current = null;
      map.remove(); mapRef.current = null;
    };
  }, []);

  const goToCurrentLocation = useCallback(() => {
    if (!mapRef.current) return;
    tempSearchPosRef.current = null;
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (!mapRef.current) return;
        const { longitude, latitude } = pos.coords;
        currentPosRef.current = { lat: latitude, lng: longitude };
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15, speed: 1.4 });
        if (currentPinRef.current) {
          currentPinRef.current.setLngLat([longitude, latitude]);
        } else {
          currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);
        }
        reverseGeocode(latitude, longitude).then(addr => { if (addr) setCurrentAddress(addr); });
        loadNearbySpots(mapRef.current, latitude, longitude, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
      },
      err => console.warn('位置情報取得失敗:', err),
      { enableHighAccuracy: true },
    );
  }, []);

  const handleFilterApply = useCallback((ids: string[]) => {
    setFilterGachaIds(ids); filterRef.current = ids;
    const pos = tempSearchPosRef.current ?? currentPosRef.current;
    if (mapRef.current && pos) {
      loadNearbySpots(mapRef.current, pos.lat, pos.lng, spotMarkersRef, ids, gachaMapRef.current, setSelectedSpot);
    }
  }, []);

  const isFiltered = filterGachaIds.length > 0;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-shrink-0 z-10">
        <div className="flex flex-col gap-2 pt-4 pb-2"
          style={{ background: 'white', borderRadius: '0 0 20px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.10)' }}>

          {/* タイトル行 */}
          <div className="flex items-center justify-between px-4">
            <h1 className="text-[22px] font-black" style={{ color: '#F2B800' }}>マップ</h1>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold"
                style={{ background: '#F5F3ED', color: '#555' }}>
                <List size={14} />リスト
              </button>
              <button onClick={goToCurrentLocation}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: '#F2B800' }}>
                <Navigation size={16} color="white" />
              </button>
            </div>
          </div>

          {/* 検索バー */}
          <SearchBar
            onSearch={handleSearch}
            onClear={handleSearchClear}
            hasSearchResult={hasSearchResult}
          />

          {/* フィルター行 */}
          <div className="flex items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setFilterOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-transform"
                style={{ background: isFiltered ? '#F2B800' : '#F5F3ED', color: isFiltered ? 'white' : '#888' }}>
                <SlidersHorizontal size={13} />
                {isFiltered ? `フィルター中 (${filterGachaIds.length})` : 'フィルター'}
              </button>
              {isFiltered && (
                <button onClick={() => handleFilterApply([])}
                  className="text-[12px] px-3 py-1.5 rounded-full"
                  style={{ background: '#FFF0C0', color: '#B8860B' }}>
                  解除
                </button>
              )}
            </div>
            {currentAddress && (
              <div className="flex items-center gap-1 min-w-0">
                <MapPin size={10} color="#F2B800" className="flex-shrink-0" />
                <span className="truncate" style={{ fontSize: 13, color: '#666', lineHeight: 1.3, fontWeight: 500 }}>
                  {currentAddress}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* マップ + オーバーレイコントロール */}
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* ズームスライダー */}
        <div className="absolute right-3 flex flex-col items-center gap-1"
          style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          <button onClick={() => mapRef.current?.zoomIn({ duration: 200 })}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shadow-md active:scale-90 transition-transform"
            style={{ background: 'white', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>+</button>
          <input type="range" min={8} max={20} step={0.5} value={zoom}
            onChange={e => { const z = parseFloat(e.target.value); setZoom(z); mapRef.current?.setZoom(z, { duration: 100 }); }}
            className="zoom-slider appearance-none rounded-full cursor-pointer"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 6, height: 120 }} />
          <button onClick={() => mapRef.current?.zoomOut({ duration: 200 })}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shadow-md active:scale-90 transition-transform"
            style={{ background: 'white', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>-</button>
        </div>

        {/* 十字キー */}
        <div className="absolute bottom-5 right-3 grid gap-1"
          style={{ gridTemplateColumns: 'repeat(3, 36px)', gridTemplateRows: 'repeat(3, 36px)', zIndex: 10 }}>
          <div />
          <button onMouseDown={() => startPan(0, -PAN_STEP)} onMouseUp={stopPan} onMouseLeave={stopPan}
            onTouchStart={() => startPan(0, -PAN_STEP)} onTouchEnd={stopPan}
            className="flex items-center justify-center rounded-xl shadow active:scale-90 transition-transform select-none"
            style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <svg viewBox="0 0 24 24" width={18} height={18}><path d="M12 5l7 7H5z" fill="#555"/></svg>
          </button>
          <div />
          <button onMouseDown={() => startPan(-PAN_STEP, 0)} onMouseUp={stopPan} onMouseLeave={stopPan}
            onTouchStart={() => startPan(-PAN_STEP, 0)} onTouchEnd={stopPan}
            className="flex items-center justify-center rounded-xl shadow active:scale-90 transition-transform select-none"
            style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <svg viewBox="0 0 24 24" width={18} height={18}><path d="M5 12l7-7v14z" fill="#555"/></svg>
          </button>
          <button onClick={goToCurrentLocation}
            className="flex items-center justify-center rounded-xl shadow active:scale-90 transition-transform"
            style={{ background: '#F2B800', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <svg viewBox="0 0 24 24" width={14} height={14}><circle cx="12" cy="12" r="4" fill="white"/><circle cx="12" cy="12" r="8" fill="none" stroke="white" strokeWidth="2"/></svg>
          </button>
          <button onMouseDown={() => startPan(PAN_STEP, 0)} onMouseUp={stopPan} onMouseLeave={stopPan}
            onTouchStart={() => startPan(PAN_STEP, 0)} onTouchEnd={stopPan}
            className="flex items-center justify-center rounded-xl shadow active:scale-90 transition-transform select-none"
            style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <svg viewBox="0 0 24 24" width={18} height={18}><path d="M19 12l-7-7v14z" fill="#555"/></svg>
          </button>
          <div />
          <button onMouseDown={() => startPan(0, PAN_STEP)} onMouseUp={stopPan} onMouseLeave={stopPan}
            onTouchStart={() => startPan(0, PAN_STEP)} onTouchEnd={stopPan}
            className="flex items-center justify-center rounded-xl shadow active:scale-90 transition-transform select-none"
            style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <svg viewBox="0 0 24 24" width={18} height={18}><path d="M12 19l7-7H5z" fill="#555"/></svg>
          </button>
          <div />
        </div>
      </div>

      <FilterDrawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleFilterApply}
        favoriteIps={favoriteIps}
        currentGachaIds={filterGachaIds}
      />
      {selectedSpot && (
        <SpotDetailSheet
          spot={selectedSpot}
          gachaMap={gachaMapRef.current}
          filterGachaIds={filterGachaIds}
          searchOverrideIds={searchOverrideIds}
          currentPos={currentPosRef.current}
          onClose={() => { setSelectedSpot(null); setSearchOverrideIds(null); }}
        />
      )}
    </div>
  );
}
