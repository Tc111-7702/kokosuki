// ─── 駅範囲サークル GeoJSON ──────────────────────────────────────────────────

/**
 * 指定座標を中心に半径 radiusM メートルの円を GeoJSON Polygon として返す。
 * Mapbox の GeoJSONSource に直接渡せる形式。
 */
export function makeCircleGeoJSON(lng: number, lat: number, radiusM: number) {
  const n = 64;
  const R = 6_378_137; // 地球赤道半径 (m)
  const coords: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const ang = (i / n) * 2 * Math.PI;
    coords.push([
      lng + (radiusM / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI) * Math.cos(ang),
      lat + (radiusM / R) * (180 / Math.PI) * Math.sin(ang),
    ]);
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}
