'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { List, Navigation, SlidersHorizontal, MapPin } from 'lucide-react';
import FilterDrawer, { loadStoredGachaIds } from '@/components/FilterDrawer';
import SpotDetailSheet, { type SpotDetail, type GachaInfo } from '@/components/SpotDetailSheet';
import SearchBar from '@/components/SearchBar';
import {
  suppressDblclick as _suppressDblclick,
  createRedPinEl,
  loadNearbySpots,
  loadSearchContentMarkers,
  type NearbySpot,
} from '@/lib/map/markers';
import { makeCircleGeoJSON } from '@/lib/map/geojson';
import { reverseGeocode, resolveLocation, resolveContent, type ContentResult } from '@/lib/map/geo';

// accessToken は page.tsx から props 経由で受け取る（下記 MapClient を参照）


const STATION_RADIUS = 1000;
const STORAGE_KEY   = 'mikke_filter_gacha_ids';


// ─── MapClient ───────────────────────────────────────────────────────────────


export default function MapPage() {
  const searchParams   = useSearchParams();
  const spotIdParam    = searchParams.get('spotId');
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
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
    const {
      resolvedSpot,
      resolvedPos,
      resolvedGeoAddress,
      searchLocationType,
      addressFilterText,
    } = await resolveLocation(locationQuery, coords, currentPos, mapboxToken);

    // ── コンテンツ解決 ──
    const contentResult: ContentResult | null = await resolveContent(contentQuery);

    const map = mapRef.current;

    // ── ケース分岐 ──

    if (resolvedSpot && !contentResult) {
      // ケース1: 店舗名のみ（フィルター有効時はフィルターのガチャを表示）
      placeSearchPin(map, resolvedSpot.lat, resolvedSpot.lng);
      currentPinRef.current?.setLngLat([resolvedSpot.lng, resolvedSpot.lat]);
      setCurrentAddress(resolvedSpot.name);
      map.flyTo({ center: [resolvedSpot.lng, resolvedSpot.lat], zoom: 17, duration: 1000 });
      if (filterRef.current.length > 0) setSearchOverrideIds(filterRef.current);
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
      reverseGeocode(lat, lng, mapboxToken).then(addr => { if (addr) setCurrentAddress(addr); });
    }
    if (tempSearchPosRef.current && currentPosRef.current && mapRef.current) {
      tempSearchPosRef.current = null;
      const { lat, lng } = currentPosRef.current;
      loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
    }
  }, [clearSearchResults]);

  // spotId パラメータ: フィルターリセット → スポットにフライ
  useEffect(() => {
    if (!spotIdParam) return;
    setFilterGachaIds([]);
    filterRef.current = [];
    fetch(`/api/spots/${spotIdParam}`)
      .then(r => r.json())
      .then(d => {
        if (!d.spot) return;
        setSelectedSpot(d.spot);
        const flyToSpot = (retries = 20) => {
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [d.spot.lng, d.spot.lat], zoom: 17, duration: 1200 });
          } else if (retries > 0) {
            setTimeout(() => flyToSpot(retries - 1), 200);
          }
        };
        flyToSpot();
      })
      .catch(() => {});
  }, [spotIdParam]);

  // 初期化
  useEffect(() => {
    const skipFilter = !!spotIdParam;
    const stored = loadStoredGachaIds();
    if (!skipFilter && stored.length > 0) { setFilterGachaIds(stored); filterRef.current = stored; }
    // Supabase コールドスタート対策: 失敗時は最大3回リトライ
    const loadFilters = async (retries = 3): Promise<void> => {
      try {
        const r = await fetch('/api/gacha/filters');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { items }: { items: GachaInfo[] } = await r.json();
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
      } catch {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, 5000));
          return loadFilters(retries - 1);
        }
        console.error('[map] /api/gacha/filters failed after retries');
      }
    };
    loadFilters();
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
      if (_suppressDblclick) return;
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
      reverseGeocode(lat, lng, mapboxToken).then(addr => { if (addr) setCurrentAddress(addr); });
      loadNearbySpots(map, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot);
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
      (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData(makeCircleGeoJSON(lng, lat, STATION_RADIUS));
      map.flyTo({ center: [lng, lat], zoom: Math.max(mapRef.current?.getZoom() ?? 14, 15), duration: 800 });
      reverseGeocode(lat, lng, mapboxToken).then(addr => {
        setCurrentAddress(addr ? `${stationName}駅（${addr}）` : `${stationName}駅`);
      });
      loadNearbySpots(map, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot, { radius: STATION_RADIUS });
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
        if (!spotIdParam) mapRef.current.setCenter([longitude, latitude]);
        if (currentPinRef.current) {
          currentPinRef.current.setLngLat([longitude, latitude]);
        } else {
          currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);
        }
        reverseGeocode(latitude, longitude, mapboxToken).then(addr => { if (addr) setCurrentAddress(addr); });
        (mapRef.current.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
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
        reverseGeocode(latitude, longitude, mapboxToken).then(addr => { if (addr) setCurrentAddress(addr); });
        (mapRef.current.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
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
