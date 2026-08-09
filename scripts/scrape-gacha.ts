import 'dotenv/config';
import { runGachaScraping } from '@/lib/scrapers/gacha-island';

// 手動実行: npm run scrape:gacha
// shops → shop-sync → schedule を1回だけ順番に実行して終了する
runGachaScraping()
  .then(() => { console.log('[scrape:gacha] 完了'); process.exit(0); })
  .catch((e) => { console.error('[scrape:gacha] エラー', e); process.exit(1); });
