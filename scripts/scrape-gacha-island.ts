/**
 * ガチャアイランド スクレイパー 手動実行スクリプト
 *
 * 使い方:
 *   npx tsx scripts/scrape-gacha-island.ts          # 最新2ページ（通常）
 *   npx tsx scripts/scrape-gacha-island.ts --all     # 全ページ（初回一括取得）
 *   npx tsx scripts/scrape-gacha-island.ts --pages 5 # 指定ページ数
 */

import 'dotenv/config';
import { scrapeGachaIsland } from '../lib/scrapers/gacha-island';

const args = process.argv.slice(2);
const allFlag = args.includes('--all');
const pagesIdx = args.indexOf('--pages');
const maxPages = allFlag
  ? undefined
  : pagesIdx !== -1
  ? Number(args[pagesIdx + 1])
  : 2;

(async () => {
  console.log(`[scraper] 開始 — ${maxPages === undefined ? '全ページ' : `最大 ${maxPages} ページ`}`);
  const start = Date.now();

  const result = await scrapeGachaIsland(maxPages);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[scraper] 完了 (${elapsed}s)`);
  console.log(`  saved  : ${result.saved}`);
  console.log(`  skipped: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`  errors : ${result.errors.length}`);
    result.errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
  }
})();
