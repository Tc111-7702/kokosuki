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

/** 駅名検索意図: 「◯◯駅」と明示したときのみ */
function isStationIntent(q: string): boolean {
  return q.endsWith('駅');
}

/** エリアサジェストと完全一致したときのみ住所フィルタ */
function isAreaIntent(q: string, areaLabels: string[]): boolean {
  return areaLabels.some(label => label === q);
}

async function fetchSpotsByNameSearch(
  q: string,
  gachaId: string,
  latParam: string,
  areaLabels: string[],
): Promise<RawSpot[]> {
  const data = await fetch(
    `/api/spots/search?name=${encodeURIComponent(q)}&suggest=1&gachaId=${encodeURIComponent(gachaId)}${latParam}`,
  ).then(r => r.json());

  let spots: RawSpot[] = data.suggestions ?? [];

  if (isAreaIntent(q, areaLabels)) {
    const filtered = spots.filter(s => s.address.includes(q));
    if (filtered.length > 0) spots = filtered;
  }

  return spots;
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

  // 「◯◯駅」入力時のみ駅周辺 1km。0 件なら店舗名検索へフォールバック
  if (bestStation && isStationIntent(q)) {
    const data = await fetch(
      `/api/spots/nearby?lat=${bestStation.lat}&lng=${bestStation.lng}` +
      `&radius=${STATION_SEARCH_RADIUS}&gachaId=${encodeURIComponent(gachaId)}&limit=50`,
    ).then(r => r.json());
    const stationSpots = toSuggestions(data.spots ?? [], userPos);
    if (stationSpots.length > 0) return stationSpots.slice(0, 50);
  }

  const spots = await fetchSpotsByNameSearch(q, gachaId, latParam, areaLabels);
  return toSuggestions(spots, userPos).slice(0, 50);
}
