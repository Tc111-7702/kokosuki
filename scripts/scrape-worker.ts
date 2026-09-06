import 'dotenv/config';
import { startGachaScraping } from '@/lib/scrapers/gacha-island';
import { startPhoneScraping } from '@/lib/scrapers/phone';
import { getSchedule, type ScrapeType, type ScheduleConfig } from '@/lib/scrapeSchedule';
import type { ScraperPollingHandle } from '@/lib/scraperPolling';

// 常駐ワーカー: Vercel ではなく常駐 Node プロセスで実行すること。
//   起動例: npm run worker
// 予約設定（DB: ScrapeSchedule）を起動時に読み込んでポーリングを開始し、
// 以降は WATCH_INTERVAL_MS ごとに DB を監視して、変更があればタイマーを張り直す。
// → admin 側は DB を更新するだけで、worker 再起動なしに新スケジュールが反映される。

const WATCH_INTERVAL_MS = 30_000; // DBの予約設定を監視する間隔

const TYPES: ScrapeType[] = ['gacha', 'phone'];

type Managed = { handle: ScraperPollingHandle; config: ScheduleConfig };

function startFor(type: ScrapeType, cfg: ScheduleConfig): ScraperPollingHandle {
  return type === 'gacha'
    ? startGachaScraping({ everyDays: cfg.everyDays, atTime: cfg.atTime })
    : startPhoneScraping({ everyDays: cfg.everyDays, atTime: cfg.atTime });
}

const sameConfig = (a: ScheduleConfig, b: ScheduleConfig) =>
  a.everyDays === b.everyDays && a.atTime === b.atTime;

async function main() {
  const managers: Partial<Record<ScrapeType, Managed>> = {};

  // DBを読み、未起動なら開始・変更があれば張り直す。
  const sync = async () => {
    for (const type of TYPES) {
      const cfg = await getSchedule(type);
      const cur = managers[type];
      if (!cur) {
        managers[type] = { handle: startFor(type, cfg), config: cfg };
      } else if (!sameConfig(cur.config, cfg)) {
        console.log(`[worker] ${type} スケジュール変更を検知 → 再スケジュール`, cfg);
        cur.handle.stop();
        managers[type] = { handle: startFor(type, cfg), config: cfg };
      }
    }
  };

  await sync(); // 初回起動
  console.log(`[worker] ポーリング開始 / ${WATCH_INTERVAL_MS / 1000}秒ごとにDBを監視して自動反映`);

  // 監視ループ（このタイマーがプロセスの keep-alive も兼ねる）
  setInterval(() => {
    sync().catch((e) => console.error('[worker] 監視エラー', e));
  }, WATCH_INTERVAL_MS);
}

main().catch((e) => { console.error('[worker] 起動エラー', e); process.exit(1); });
