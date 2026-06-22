import { db } from '@/lib/db';

const BASE = 'https://gacha-island.jp/shops';

export interface MachineScrapeResult {
  saved: number;
  skipped: number;
  errors: string[];
}

/** 店舗ページから入荷商品のwpPostIdを抽出 */
async function fetchWpPostIdsForShop(gachaIslandId: number, prefSlug: string): Promise<number[]> {
  const url = `${BASE}/${prefSlug}/${gachaIslandId}/`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const html = await res.text();

  // <a href="https://gacha-island.jp/39823/" ...> の数値部分を抽出
  const matches = [...html.matchAll(/gacha-island\.jp\/(\d+)\//g)];
  const ids = [...new Set(matches.map((m) => parseInt(m[1])))].filter((id) => id > 0);
  return ids;
}

/** 関西全店舗の入荷情報をスクレイプしてMachineテーブルにupsert */
export async function scrapeKansaiMachines(): Promise<MachineScrapeResult> {
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  // gachaIslandIdを持つSpotをすべて取得
  const spots = await db.findSpotsWithGachaIslandId();
  console.log(`[gacha-island-machines] ${spots.length}店舗を処理`);

  for (const spot of spots) {
    if (!spot.gachaIslandId) continue;

    // 都道府県スラッグを住所から推定
    const prefSlug = guessPrefSlug(spot.address);
    if (!prefSlug) {
      skipped++;
      continue;
    }

    try {
      const wpPostIds = await fetchWpPostIdsForShop(spot.gachaIslandId, prefSlug);

      for (const wpPostId of wpPostIds) {
        try {
          const gacha = await db.findGachaByWpPostId(wpPostId);
          if (!gacha) {
            skipped++;
            continue;
          }

          await db.upsertMachine(spot.id, gacha.id);
          saved++;
        } catch (e) {
          skipped++;
          errors.push(`Machine spot=${spot.id} wpPostId=${wpPostId}: ${String(e)}`);
        }
      }

      // サーバー負荷軽減
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      errors.push(`Spot ${spot.id} (${spot.name}): ${String(e)}`);
    }
  }

  return { saved, skipped, errors };
}

/** 住所の都道府県名からスラッグを推定 */
function guessPrefSlug(address: string): string | null {
  const map: Record<string, string> = {
    '大阪': 'osaka',
    '兵庫': 'hyogo',
    '京都': 'kyoto',
    '奈良': 'nara',
    '滋賀': 'shiga',
    '和歌山': 'wakayama',
  };
  for (const [name, slug] of Object.entries(map)) {
    if (address.includes(name)) return slug;
  }
  return null;
}
