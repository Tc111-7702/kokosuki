import { scraperPolling, runSequential } from '@/lib/scraperPolling';
import { scrapeKansaiShops } from '@/lib/scrapers/gacha-island-shops';
import { syncShopGachas } from '@/lib/scrapers/gacha-island-shop-sync';
import { syncScheduleGachas } from '@/lib/scrapers/gacha-island-schedule';

// デフォルト設定（あとで start/run の引数で上書き可）
export const GACHA_DEFAULT = {
  everyWeeks: 4,      // a: 4週間ごと
  dayOfWeek: 0,       // 実行曜日（0=日曜）
  atTime: '03:00',    // b: 実行時刻
};

// 実行するタスク（正しい順序: 店舗リスト → 店舗ガチャ同期 → 発売スケジュール）
const GACHA_TASKS = [
  () => scrapeKansaiShops(),   // shops（Spot作成）
  () => syncShopGachas(),      // shop-sync（店舗×ガチャ）
  () => syncScheduleGachas(),  // schedule（予定ガチャ補完）
];

/** 定期ポーリング開始（常駐プロセス用）。停止関数を返す。 */
export function startGachaScraping(
  opts: { everyWeeks?: number; dayOfWeek?: number; atTime?: string } = {},
): () => void {
  return scraperPolling({
    label: 'gacha-island',
    everyWeeks: opts.everyWeeks ?? GACHA_DEFAULT.everyWeeks,
    dayOfWeek:  opts.dayOfWeek  ?? GACHA_DEFAULT.dayOfWeek,
    atTime:     opts.atTime     ?? GACHA_DEFAULT.atTime,
    tasks: GACHA_TASKS,
  });
}

/** 手動実行: shops → shop-sync → schedule を1回だけ順番に実行（ワンクリック用） */
export function runGachaScraping(): Promise<void> {
  return runSequential(GACHA_TASKS, 'gacha-island(manual)');
}
