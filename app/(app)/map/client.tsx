'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { List, Map as MapIcon, Navigation, SlidersHorizontal, MapPin } from 'lucide-react';
import FilterDrawer from '@/components/FilterDrawer';
import SpotDetailSheet, { type SpotDetail, type GachaInfo } from '@/components/SpotDetailSheet';
import SearchBar from '@/components/SearchBar';
import {
  suppressDblclick as _suppressDblclick,
  closeAllMarkerPopups,
  createRedPinEl,
  loadNearbySpots,
  loadSearchContentMarkers,
  type NearbySpot,
} from '@/lib/map/markers';
import SpotListPanel from '@/components/SpotListPanel';
import { makeCircleGeoJSON } from '@/lib/map/geojson';
import { reverseGeocode, resolveLocation, resolveContent, type ContentResult } from '@/lib/map/geo';

// accessToken は page.tsx から props 経由で受け取る（下記 MapClient を参照）

const STATION_RADIUS  = 1000;
const STORAGE_KEY     = 'mikke_filter_gacha_ids';
const LIKED_SEED_KEY  = 'mikke_filter_liked_seed_v1';
const MIGRATION_KEY   = 'mikke_filter_migrated_v3';

// v3移行: ユーザーリセット後のキャッシュクリア
if (typeof window !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('mikke_filter_gacha_ids_seed');
  localStorage.removeItem(LIKED_SEED_KEY);
  localStorage.removeItem('mikke_filter_migrated_v2');
  localStorage.setItem(MIGRATION_KEY, '1');
}

// ─── MapClient ───────────────────────────────────────────────────────────────

export default function MapPage() {
  const searchParams   = useSearchParams();
  const spotIdParam        = searchParams.get('spotId');
  const highlightGachaId   = searchParams.get('highlightGachaId') ?? undefined;
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
  const filterRef           = useRef<string[]>([]);
  const gachaMapRef         = useRef<Map<string, GachaInfo>>(new Map());
  const hasSearchResultRef  = useRef(false);  // コンテンツ検索中はスポットマーカー再ロードを抑制
  const spotIdModeRef       = useRef(!!spotIdParam); // spotIdParam 到着時は GPS 自動ロードを抑制

  const [favoriteIps, setFavoriteIps]             = useState<string[]>([]);
  const [filterOpen, setFilterOpen]               = useState(false);
  const [filterGachaIds, setFilterGachaIds]       = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot]           = useState<SpotDetail | null>(null);
  const [searchOverrideIds, setSearchOverrideIds] = useState<string[] | null>(null);
  const [contentSearchLabel, setContentSearchLabel] = useState<string | null>(null);
  const [hasSearchResult, setHasSearchResult]     = useState(false);
  const [showList, setShowList]                   = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('mikke_map_show_list') === '1'
  );
  const [filterSpotList, setFilterSpotList]         = useState<NearbySpot[]>([]);
  const [searchSpotList, setSearchSpotList]         = useState<NearbySpot[]>([]);
  const [searchContentGachaIds, setSearchContentGachaIds] = useState<string[]>([]);
  const [currentAddress, setCurrentAddress]       = useState<string | null>(null);
  const [currentPos, setCurrentPos]               = useState<{ lat: number; lng: number } | null>(null);

  filterRef.current          = filterGachaIds;
  hasSearchResultRef.current = hasSearchResult;

  const updateCurrentPos = useCallback((lat: number, lng: number) => {
    currentPosRef.current = { lat, lng };
    setCurrentPos({ lat, lng });
  }, []);

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
    setContentSearchLabel(null);
    setSearchSpotList([]);
    setSearchContentGachaIds([]);
    hasSearchResultRef.current = false;  // 即時反映（GPSコールバック等の競合防止）
    setHasSearchResult(false);
  }, []);

  // リスト/マップ表示モードを永続化
  useEffect(() => {
    try { localStorage.setItem('mikke_map_show_list', showList ? '1' : '0'); } catch {}
  }, [showList]);

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
    hasSearchResultRef.current = true;  // 即時反映
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
    // コンテンツ検索ラベルをセット（店舗ページへの引き継ぎ用）
    // contentResult.label はDBの最初のシリーズ名になることがあるため、
    // ユーザーが実際に入力したクエリを使う（エイリアス展開はAPIが再実行する）
    if (contentResult) {
      setContentSearchLabel(contentQuery.trim());
      setSearchContentGachaIds(contentResult.gachaIds);
    }

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
          ? { radius: STATION_RADIUS, onSpotsLoaded: setFilterSpotList }
          : { radius: 200000, addressFilter: addressFilterText ?? undefined, onSpotsLoaded: setFilterSpotList }
      );

    } else if (!locationQuery.trim() && contentResult) {
      // ケース3・4: コンテンツのみ（現在地 or 仮位置）
      // コンテンツマーカー（黄色）を配置し、ヒットしなかったフィルター店舗は通常マーカーで残す
      const pos = tempSearchPosRef.current ?? currentPosRef.current;
      if (pos) {
        const { spotIds } = await loadSearchContentMarkers(map, pos.lat, pos.lng, contentResult.gachaIds, gachaMapRef.current, searchMarkersRef,
          (spot, overrideIds) => { setSearchOverrideIds(overrideIds); setSelectedSpot(spot); },
          { onSpotsLoaded: setSearchSpotList }
        );
        // フィルターがある場合: コンテンツヒット店舗を除外してフィルターマーカーを表示
        if (filterRef.current.length > 0) {
          loadNearbySpots(map, pos.lat, pos.lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
            { excludeSpotIds: spotIds, onSpotsLoaded: setFilterSpotList }
          );
        } else {
          spotMarkersRef.current.forEach(m => m.remove());
          spotMarkersRef.current = [];
        }
      }

    } else if (resolvedPos && contentResult) {
      // ケース7・8: 住所 + コンテンツ
      tempSearchPosRef.current = resolvedPos;
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
      const contentOpts78 = isStation78
        ? { radius: STATION_RADIUS }
        : { radius: 200000, addressFilter: addressFilterText ?? undefined };
      const { spotIds: contentSpotIds78 } = await loadSearchContentMarkers(map, resolvedPos.lat, resolvedPos.lng, contentResult.gachaIds, gachaMapRef.current, searchMarkersRef,
        (spot, overrideIds) => { setSearchOverrideIds(overrideIds); setSelectedSpot(spot); },
        { ...contentOpts78, onSpotsLoaded: setSearchSpotList }
      );
      // フィルターがある場合: コンテンツヒット店舗を除外してフィルターマーカーを表示
      if (filterRef.current.length > 0) {
        loadNearbySpots(map, resolvedPos.lat, resolvedPos.lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
          { ...contentOpts78, excludeSpotIds: contentSpotIds78, onSpotsLoaded: setFilterSpotList }
        );
      } else {
        spotMarkersRef.current.forEach(m => m.remove());
        spotMarkersRef.current = [];
      }

    } else if (locationQuery.trim() && !resolvedSpot && !resolvedPos) {
      // フォールバック: 位置情報として解決できない場合はコンテンツ検索を試みる
      const fb = await resolveContent(locationQuery);
      if (fb) {
        setContentSearchLabel(locationQuery.trim());
        setSearchContentGachaIds(fb.gachaIds);
        const pos = tempSearchPosRef.current ?? currentPosRef.current;
        if (pos) {
          const { spotIds: fbSpotIds } = await loadSearchContentMarkers(
            map, pos.lat, pos.lng, fb.gachaIds, gachaMapRef.current, searchMarkersRef,
            (spot, overrideIds) => { setSearchOverrideIds(overrideIds); setSelectedSpot(spot); },
            { onSpotsLoaded: setSearchSpotList }
          );
          if (filterRef.current.length > 0) {
            loadNearbySpots(map, pos.lat, pos.lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
              { excludeSpotIds: fbSpotIds, onSpotsLoaded: setFilterSpotList }
            );
          } else {
            spotMarkersRef.current.forEach(m => m.remove());
            spotMarkersRef.current = [];
          }
        }
      }
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
      // 検索(位置/コンテンツ)の種類に関わらず、現在地＋現在のフィルターで通常マーカーを再ロードする。
      // コンテンツ検索中は通常マーカーを除外(excludeSpotIds)/全削除しており、かつ tempSearchPosRef が
      // 無いため、ここで必ず再ロードしないと解除後にフィルターが効かなくなる（マーカーが復元されない）。
      tempSearchPosRef.current = null;
      loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
        { onSpotsLoaded: setFilterSpotList });
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
        const spot = d.spot;
        const flyAndOpen = (retries = 20) => {
          if (mapRef.current) {
            const map = mapRef.current;
            // 行き先の近くのスポットを読み込む（現在地が遠くてもピンが表示されるよう）
            loadNearbySpots(map, spot.lat, spot.lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
              { onSpotsLoaded: setFilterSpotList });
            // flyTo してから選択（moveend 後に applyPan が正しく動くよう）
            map.flyTo({ center: [spot.lng, spot.lat], zoom: 17, duration: 1200 });
            map.once('moveend', () => setSelectedSpot(spot));
          } else if (retries > 0) {
            setTimeout(() => flyAndOpen(retries - 1), 200);
          }
        };
        flyAndOpen();
      })
      .catch(() => {});
  }, [spotIdParam]);

  // スポット選択時: ピンをシートの直上に表示
  useEffect(() => {
    if (!selectedSpot || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    const containerEl = containerRef.current;
    const applyPan = () => {
      const rect = containerEl.getBoundingClientRect();
      // ピンのキャンバス上の現在位置
      const point = map.project([selectedSpot.lng, selectedSpot.lat]);
      // シート上端の100px上を目標Y（ビューポート基準 → キャンバス基準に変換）
      const targetCanvasY = (window.innerHeight * 0.54 - 100) - rect.top;
      const delta = point.y - targetCanvasY;
      if (Math.abs(delta) > 5) {
        map.panBy([0, delta], { duration: 400 });
      }
    };
    if (map.isMoving()) {
      map.once('moveend', applyPan);
      return () => { map.off('moveend', applyPan); };
    } else {
      const t = setTimeout(applyPan, 80);
      return () => clearTimeout(t);
    }
  }, [selectedSpot?.id]);

  // 初期化
  useEffect(() => {
    const skipFilter = !!spotIdParam;
    // rawFilter が null → 未設定（初回）→ お気に入り自動適用あり
    // rawFilter が '[]' → ユーザーが意図的に解除 → お気に入り自動適用しない
    const rawFilter = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const stored = rawFilter ? (JSON.parse(rawFilter) as string[]) : [];
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
        if (currentPosRef.current && mapRef.current && !hasSearchResultRef.current && !spotIdModeRef.current) {
          const { lat, lng } = currentPosRef.current;
          loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, filterRef.current, map, setSelectedSpot,
            { onSpotsLoaded: setFilterSpotList });
        }
        fetch('/api/profile/me').then(r => r.json()).then(profile => {
          const favIps: string[] = Array.isArray(profile.favoriteIps) ? profile.favoriteIps : [];
          const likedIds: string[] = Array.isArray(profile.likedGachaIds) ? profile.likedGachaIds : [];
          setFavoriteIps(favIps);
          if (skipFilter) return;

          // いいねシード: 前回マップを開いた時点のlikedIds
          const seed: string[] = (() => {
            try { return JSON.parse(localStorage.getItem(LIKED_SEED_KEY) || '[]') as string[]; } catch { return []; }
          })();
          // シードを最新のlikedIdsで更新
          try { localStorage.setItem(LIKED_SEED_KEY, JSON.stringify(likedIds)); } catch {}

          if (stored.length > 0) {
            // 前回以降に新しくいいねしたIDをフィルターにマージ
            const newLikes = likedIds.filter(id => !seed.includes(id) && items.some(g => g.id === id));
            if (newLikes.length > 0) {
              const merged = [...new Set([...stored, ...newLikes])];
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
              setFilterGachaIds(merged); filterRef.current = merged;
              if (currentPosRef.current && mapRef.current && !hasSearchResultRef.current && !spotIdModeRef.current) {
                const { lat, lng } = currentPosRef.current;
                loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, merged, gachaMapRef.current, setSelectedSpot,
                  { onSpotsLoaded: setFilterSpotList });
              }
            }
            return;
          }
          // リロード時は常にお気に入りをフィルターに復元（意図的解除後も含む）
          if (likedIds.length > 0) {
            // filtersに存在するIDのみに絞る
            const validIds = likedIds.filter(id => items.some(g => g.id === id));
            if (validIds.length > 0) {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(validIds)); } catch {}
              try { localStorage.setItem('mikke_filter_gacha_ids_seed', JSON.stringify(validIds)); } catch {}
              setFilterGachaIds(validIds); filterRef.current = validIds;
              if (currentPosRef.current && mapRef.current && !hasSearchResultRef.current && !spotIdModeRef.current) {
                const { lat, lng } = currentPosRef.current;
                loadNearbySpots(mapRef.current, lat, lng, spotMarkersRef, validIds, gachaMapRef.current, setSelectedSpot,
                  { onSpotsLoaded: setFilterSpotList });
              }
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

    // マップクリックでホバーポップアップをすべて閉じる
    map.on('click', closeAllMarkerPopups);

    // ダブルクリックで現在地ピンを移動＋住所更新
    map.on('dblclick', (e) => {
      if (_suppressDblclick) return;
      const { lat, lng } = e.lngLat;
      updateCurrentPos(lat, lng);
      if (currentPinRef.current) {
        currentPinRef.current.setLngLat([lng, lat]);
      } else {
        currentPinRef.current = new mapboxgl.Marker({ color: '#F2B800' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
      (map.getSource('station-range') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
      reverseGeocode(lat, lng, mapboxToken).then(addr => { if (addr) setCurrentAddress(addr); });
      // コンテンツ検索中はスポットマーカーを上書きしない
      if (!hasSearchResultRef.current) {
        loadNearbySpots(map, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
          { onSpotsLoaded: setFilterSpotList });
      }
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
      updateCurrentPos(lat, lng);
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
      if (!hasSearchResultRef.current) {
        loadNearbySpots(map, lat, lng, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
          { radius: STATION_RADIUS, onSpotsLoaded: setFilterSpotList });
      }
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
        updateCurrentPos(latitude, longitude);
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
        // コンテンツ検索中・spotIdモード中はスポットマーカーを上書きしない
        if (!hasSearchResultRef.current && !spotIdModeRef.current) {
          loadNearbySpots(mapRef.current, latitude, longitude, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
            { onSpotsLoaded: setFilterSpotList });
        }
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
        updateCurrentPos(latitude, longitude);
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
        // 現在地ボタン押下: コンテンツ検索を終了してフィルターマーカーを表示
        clearSearchResults();
        loadNearbySpots(mapRef.current, latitude, longitude, spotMarkersRef, filterRef.current, gachaMapRef.current, setSelectedSpot,
          { onSpotsLoaded: setFilterSpotList });
      },
      err => console.warn('位置情報取得失敗:', err),
      { enableHighAccuracy: true },
    );
  }, [clearSearchResults]);

  const handleFilterApply = useCallback((ids: string[]) => {
    setFilterGachaIds(ids); filterRef.current = ids;
    // idsが空（解除）のときは '[]' をセット（nullとの区別でお気に入り再適用を防ぐ）
    if (ids.length === 0) {
      try { localStorage.setItem(STORAGE_KEY, '[]'); } catch {}
    }
    // フィルター変更時はコンテンツ検索を終了してフィルターマーカーで置き換える
    clearSearchResults();
    const pos = tempSearchPosRef.current ?? currentPosRef.current;
    if (mapRef.current && pos) {
      loadNearbySpots(mapRef.current, pos.lat, pos.lng, spotMarkersRef, ids, gachaMapRef.current, setSelectedSpot,
        { onSpotsLoaded: setFilterSpotList });
    }
  }, [clearSearchResults]);

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
              <button onClick={() => setShowList(v => {
                if (!v) { setSelectedSpot(null); setSearchOverrideIds(null); }
                return !v;
              })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold"
                style={{ background: showList ? '#F2B800' : '#F5F3ED', color: showList ? 'white' : '#555' }}>
                {showList ? <><MapIcon size={14} />マップ</> : <><List size={14} />リスト</>}
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
            currentPos={currentPos}
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
                  className="text-[12px] px-3 py-1.5 rounded-full font-bold"
                  style={{ background: '#FFF0C0', color: '#B8860B' }}>
                  解除
                </button>
              )}
            </div>
            {currentAddress && (
              <div className="hidden md:flex items-center gap-1 min-w-0">
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

        {/* リストパネル（マップの上にオーバーレイ） */}
        {showList && (
          <SpotListPanel
            searchSpots={searchSpotList}
            filterSpots={filterSpotList}
            hasSearchResult={hasSearchResult}
            isFiltered={isFiltered}
            contentSearchLabel={contentSearchLabel}
            searchGachaIds={searchContentGachaIds}
            filterGachaIds={filterGachaIds}
          />
        )}

        {!showList && (
          <>
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
            <div className="absolute bottom-10 left-4 lg:left-8 grid gap-1"
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
          </>
        )}
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
          searchLabel={contentSearchLabel}
          highlightGachaId={highlightGachaId}
          currentPos={currentPos}
          onClose={() => { setSelectedSpot(null); setSearchOverrideIds(null); }}
          onClearFilter={() => handleFilterApply([])}
          onOpenFilter={() => setFilterOpen(true)}
        />
      )}
    </div>
  );
}
