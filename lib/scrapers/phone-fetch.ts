import * as db from '@/lib/db';

export interface PhoneFetchResult {
  updated: number;
  skipped: number;
  errors: string[];
  statusSample: string[]; // デバッグ用: 最初の5件のAPIステータス
}

/**
 * googlePlaceId を持つ全 Spot に対して Google Places API で
 * 電話番号を取得して DB に保存する。
 * すでに phone が入っているレコードはスキップ。
 */
export async function fetchPhoneNumbers(): Promise<PhoneFetchResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY が未設定です');

  const spots = await db.findSpotsWithPlaceId();
  const targets = spots.filter((s) => !s.phone && s.googlePlaceId);
  console.log(`[phone-fetch] 対象: ${targets.length}件 / 全${spots.length}件`);

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const statusSample: string[] = [];

  for (const spot of targets) {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(spot.googlePlaceId!)}` +
        `&fields=formatted_phone_number` +
        `&key=${apiKey}&language=ja`;

      const res = await fetch(url);
      if (!res.ok) { errors.push(`${spot.id}: HTTP ${res.status}`); skipped++; continue; }

      const data = await res.json();
      const phone: string | undefined = data.result?.formatted_phone_number;

      // デバッグ: 最初の5件のAPIステータスを記録
      if (statusSample.length < 5) {
        statusSample.push(`${spot.googlePlaceId}: status=${data.status}, phone=${phone ?? 'none'}`);
      }

      if (phone) {
        await db.updateSpotPhone(spot.id, phone);
        updated++;
      } else {
        skipped++;
      }

      // Places API レート制限対策（10 QPS まで）
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      errors.push(`${spot.id}: ${String(e)}`);
      skipped++;
    }
  }

  return { updated, skipped, errors, statusSample };
}
