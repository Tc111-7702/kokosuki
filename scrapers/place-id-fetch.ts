import * as db from '@/lib/db';

export interface PlaceIdFetchResult {
  updated: number;
  skipped: number;
  errors: string[];
  statusSample: string[];
}

/**
 * googlePlaceId を持たない gacha-island 由来スポットに対して
 * Google Places Find Place API で placeId を取得して保存する。
 * 取得後に電話番号も続けて取得する。
 */
export async function fetchPlaceIds(): Promise<PlaceIdFetchResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY が未設定です');

  const spots = await db.findSpotsWithoutPlaceId();
  console.log(`[place-id-fetch] 対象: ${spots.length}件`);

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const statusSample: string[] = [];

  for (const spot of spots) {
    try {
      // Find Place from Text: 店舗名 + 住所でPlaceIDを検索
      const query = encodeURIComponent(`${spot.name} ${spot.address}`);
      const url =
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
        `?input=${query}` +
        `&inputtype=textquery` +
        `&fields=place_id` +
        `&locationbias=point:${spot.lat},${spot.lng}` +
        `&key=${apiKey}&language=ja`;

      const res = await fetch(url);
      if (!res.ok) { errors.push(`${spot.id}: HTTP ${res.status}`); skipped++; continue; }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const placeId: string | undefined = candidate?.place_id;

      if (statusSample.length < 3) {
        statusSample.push(`"${spot.name}": status=${data.status}, placeId=${placeId ?? 'none'}, candidates=${data.candidates?.length ?? 0}`);
      }

      if (!placeId) { skipped++; continue; }

      try {
        await db.updateSpotPlaceId(spot.id, placeId);
        updated++;
      } catch (e: unknown) {
        // P2002 = Unique constraint violation → 同じplaceIdが別スポットに登録済み
        if ((e as { code?: string }).code === 'P2002') { skipped++; continue; }
        throw e;
      }

      // 10 QPS 対策
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      errors.push(`${spot.id}: ${String(e)}`);
      skipped++;
    }
  }

  console.log(`[place-id-fetch] 完了 updated=${updated} skipped=${skipped}`);
  return { updated, skipped, errors, statusSample };
}
