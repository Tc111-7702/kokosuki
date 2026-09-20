import 'dotenv/config';
import * as db from '@/lib/db';
import { runGachaScraping } from '@/lib/scrapers/gacha-island';
import { runPhoneScraping } from '@/lib/scrapers/phone';
import type { ScrapeType } from '@/lib/scrapeSchedule';

// GitHub Actions から1日2回(03:00/05:00 JST)呼ばれるランナー。
// 実行時刻は lib/db の SCRAPE_TIMES(JST) で固定管理し、isScrapeDue で
// 「予定時刻を過ぎていて本日未実行か」を判定。due のときだけスクレイプを1回実行する。
// 予約設定(DB管理)は廃止。GHのトリガーがスキップされた日も lastRunAt により
// 次のトリガーで取り戻す（キャッチアップ）。多重起動は GH の concurrency で防止。

const RUNNERS: Record<ScrapeType, () => Promise<void>> = {
  gacha: runGachaScraping,
  phone: runPhoneScraping,
};

async function main() {
  const types: ScrapeType[] = ['gacha', 'phone'];
  let ranAny = false;

  for (const type of types) {
    let due = false;
    try {
      due = await db.isScrapeDue(type);
    } catch (e) {
      console.error(`[scrape-cron] ${type}: due判定に失敗（DB接続断など）→ skip`, e);
      process.exitCode = 1;
      continue;
    }
    if (!due) {
      console.log(`[scrape-cron] ${type}: 予定時刻前 or 本日実行済み → skip`);
      continue;
    }

    ranAny = true;
    console.log(`[scrape-cron] ${type}: 実行開始 ${new Date().toISOString()}`);
    try {
      await RUNNERS[type]();
      await db.markScrapeRan(type);
      console.log(`[scrape-cron] ${type}: 成功`);
    } catch (e) {
      // lastRunAt を進めない＝次トリガーで再試行される
      console.error(`[scrape-cron] ${type}: 失敗（lastRunAt据え置き・次回リトライ）`, e);
      process.exitCode = 1;
    }
  }

  if (!ranAny) console.log('[scrape-cron] 今回のtickでは実行対象なし');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => { console.error('[scrape-cron] 致命的エラー', e); process.exit(1); });
