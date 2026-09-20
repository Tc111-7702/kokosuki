import 'dotenv/config';
import * as db from '@/lib/db';
import { runGachaScraping } from '@/lib/scrapers/gacha-island';
import { runPhoneScraping } from '@/lib/scrapers/phone';
import type { ScrapeType } from '@/lib/scrapeSchedule';

// GitHub Actions から定期的に呼ばれるハートビート用ランナー。
// DBの予約(ScrapeSchedule)を見て「今実行すべきか(due)」を判定し、
// due のときだけロックを取ってスクレイプ本体を1回実行する。
// due判定/ロック/結果反映のSQLは lib/db に集約（claimDueScrapeRun / finishScrapeRun）。
//
// 既存の常駐worker(scraperPolling)とは独立。将来workerを退役してもこちらだけで回る。

const RUNNERS: Record<ScrapeType, () => Promise<void>> = {
  gacha: runGachaScraping,
  phone: runPhoneScraping,
};

async function main() {
  const types: ScrapeType[] = ['gacha', 'phone'];
  let ranAny = false;

  for (const type of types) {
    let claimed = false;
    try {
      claimed = await db.claimDueScrapeRun(type);
    } catch (e) {
      console.error(`[scrape-cron] ${type}: due判定に失敗（DB接続断など）→ skip`, e);
      process.exitCode = 1;
      continue;
    }
    if (!claimed) {
      console.log(`[scrape-cron] ${type}: 実行不要 or ロック中 → skip`);
      continue;
    }

    ranAny = true;
    console.log(`[scrape-cron] ${type}: due → 実行開始 ${new Date().toISOString()}`);
    try {
      await RUNNERS[type]();
      await db.finishScrapeRun(type, true);
      console.log(`[scrape-cron] ${type}: 成功`);
    } catch (e) {
      await db.finishScrapeRun(type, false).catch(() => undefined);
      console.error(`[scrape-cron] ${type}: 失敗（ロック解放・次回リトライ）`, e);
      process.exitCode = 1;
    }
  }

  if (!ranAny) console.log('[scrape-cron] 今回のtickでは実行対象なし');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => { console.error('[scrape-cron] 致命的エラー', e); process.exit(1); });
