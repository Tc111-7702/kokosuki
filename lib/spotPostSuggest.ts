/** マップの駅検索円と同じ半径（m） */
export const STATION_SEARCH_RADIUS = 1000;

export interface PostSpotSuggestion {
  id: string;
  name: string;
  address: string;
  distance?: number;
}

type RawSpot = { id: string; name: string; address: string; lat?: number; lng?: number; distance?: number };

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toSuggestions(spots: RawSpot[], userPos: { lat: number; lng: number } | null): PostSpotSuggestion[] {
  const mapped = spots.map(s => ({
    id: s.id,
    name: s.name,
    address: s.address,
    distance: s.distance ?? (userPos && s.lat != null && s.lng != null
      ? Math.round(haversine(userPos.lat, userPos.lng, s.lat, s.lng))
      : undefined),
  }));
  if (!userPos) return mapped;
  return mapped.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

function isStationIntent(q: string, stationLabel: string): boolean {
  const cleanQ = q.replace(/駅$/, '').trim().toLowerCase();
  const stName = stationLabel.replace(/駅$/, '').trim().toLowerCase();
  return q.endsWith('駅') || (cleanQ.length >= 2 && stName === cleanQ);
}

function isAreaIntent(q: string, areaLabels: string[]): boolean {
  if (/[都道府県]$/.test(q)) return true;
  if (/[市区町村]$/.test(q) && q.length >= 3) return true;
  return areaLabels.some(label => label === q);
}

/** 投稿フォーム用：サジェストは店舗名のみ（ガチャ設置店・近い順） */
export async function fetchPostSpotSuggestions(
  query: string,
  gachaId: string,
  userPos: { lat: number; lng: number } | null,
): Promise<PostSpotSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2 || !gachaId) return [];

  const lat = userPos?.lat ?? 0;
  const lng = userPos?.lng ?? 0;
  const latParam = lat && lng ? `&lat=${lat}&lng=${lng}` : '';

  const [stationData, areaData] = await Promise.all([
    fetch(`/api/station-suggest?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ suggestions: [] })),
    fetch(`/api/area-suggest?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ suggestions: [] })),
  ]);

  const bestStation = stationData.suggestions?.[0] as { label: string; lat: number; lng: number } | undefined;
  const areaLabels: string[] = (areaData.suggestions ?? []).map((a: { label: string }) => a.label);

  // 駅名 → マップと同じ 1km 圏内
  if (bestStation && isStationIntent(q, bestStation.label)) {
    const data = await fetch(
      `/api/spots/nearby?lat=${bestStation.lat}&lng=${bestStation.lng}` +
      `&radius=${STATION_SEARCH_RADIUS}&gachaId=${encodeURIComponent(gachaId)}&limit=50`,
    ).then(r => r.json());
    return toSuggestions(data.spots ?? [], userPos).slice(0, 50);
  }

  // 店舗名 / 都道府県 / 市区町村
  const data = await fetch(
    `/api/spots/search?name=${encodeURIComponent(q)}&suggest=1&gachaId=${encodeURIComponent(gachaId)}${latParam}`,
  ).then(r => r.json());

  let spots: RawSpot[] = data.suggestions ?? [];

  // 都道府県・市区町村入力時は住所一致を優先
  if (isAreaIntent(q, areaLabels)) {
    spots = spots.filter(s => s.address.includes(q));
  }

  return toSuggestions(spots, userPos).slice(0, 50);
}
