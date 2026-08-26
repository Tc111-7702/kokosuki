import * as db from '@/lib/db';
import { KANSAI_PREFS, SHOP_BASE, GEOCODE_BASE } from './constants';

export interface ShopScrapeResult {
  saved: number;
  skipped: number;
  errors: string[];
}

/** 住所 → 緯度経度（Google Geocoding API） */
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${apiKey}&language=ja`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}

/** 1都道府県の全ページから店舗IDと名前・住所を取得 */
async function fetchShopsForPref(
  pref: string,
): Promise<Array<{ id: number; name: string; address: string }>> {
  const shops: Array<{ id: number; name: string; address: string }> = [];

  // 1ページ目で総ページ数を把握
  const firstHtml = await fetch(`${SHOP_BASE}/${pref}/`).then((r) => r.text());
  const pageNums = [...firstHtml.matchAll(/page\/(\d+)\//g)].map((m) => parseInt(m[1]));
  const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;

  for (let page = 1; page <= maxPage; page++) {
    const url = page === 1 ? `${SHOP_BASE}/${pref}/` : `${SHOP_BASE}/${pref}/page/${page}/`;
    const html = await fetch(url).then((r) => r.text());

    // 店舗IDと名前
    const nameMatches = [...html.matchAll(new RegExp(`shops/${pref}/(\\d+)/\">([^<]+)</a>`, 'g'))];
    // 住所（Google MapsリンクのURLデコード）
    const addrMatches = [...html.matchAll(/query=([^"&]+)/g)];

    for (let i = 0; i < nameMatches.length; i++) {
      const id = parseInt(nameMatches[i][1]);
      const name = nameMatches[i][2].trim();
      const address = addrMatches[i] ? decodeURIComponent(addrMatches[i][1]) : '';
      if (!shops.find((s) => s.id === id)) {
        shops.push({ id, name, address });
      }
    }

    // サーバー負荷軽減
    await new Promise((r) => setTimeout(r, 300));
  }

  return shops;
}

/** 関西全店舗をスクレイプしてDBにupsert */
export async function scrapeKansaiShops(): Promise<ShopScrapeResult> {
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pref of KANSAI_PREFS) {
    console.log(`[gacha-island-shops] ${pref} スクレイプ開始`);
    try {
      const shops = await fetchShopsForPref(pref);
      console.log(`[gacha-island-shops] ${pref}: ${shops.length}件取得`);

      for (const shop of shops) {
        try {
          // 既存レコードチェック
          const existing = await db.findSpotByGachaIslandId(shop.id);
          if (existing) {
            skipped++;
            continue;
          }

          if (!shop.address) {
            errors.push(`Shop ${shop.id}: 住所なし`);
            skipped++;
            continue;
          }

          // ジオコーディング
          const geo = await geocode(shop.address);
          if (!geo) {
            errors.push(`Shop ${shop.id} ${shop.name}: ジオコーディング失敗`);
            skipped++;
            continue;
          }

          await db.upsertSpotFromGachaIsland({
            gachaIslandId: shop.id,
            name: shop.name,
            address: shop.address,
            lat: geo.lat,
            lng: geo.lng,
          });
          saved++;

          // Geocoding API レート制限対策
          await new Promise((r) => setTimeout(r, 150));
        } catch (e) {
          skipped++;
          errors.push(`Shop ${shop.id}: ${String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`${pref}: ${String(e)}`);
    }
  }

  return { saved, skipped, errors };
}
