// 位置真正性（B）: 投稿は対象スポットの半径内にいる時だけ許可する。
// ここはデモ用の距離計算。本番は端末GPS＋なりすまし対策（L1 isFromMockProvider 等）を別途実装する。

export const POST_RADIUS_M = 500; // この半径内でのみ「引いた！」「在庫報告」が可能

/** 2点間の距離（メートル）— Haversine */
export function distanceMeters(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 表示用：m / km */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}
