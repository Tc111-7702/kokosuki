import 'dotenv/config';
import { runPhoneScraping } from '@/lib/scrapers/phone';

// 手動実行: npm run scrape:phone
// place-id → phone-fetch を1回だけ順番に実行して終了する
runPhoneScraping()
  .then(() => { console.log('[scrape:phone] 完了'); process.exit(0); })
  .catch((e) => { console.error('[scrape:phone] エラー', e); process.exit(1); });
