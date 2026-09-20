import { runSequential } from '@/lib/scrapers/runSequential';
import { scrapeKansaiShops } from '@/lib/scrapers/gacha-island-shops';
import { syncShopGachas } from '@/lib/scrapers/gacha-island-shop-sync';
import { syncScheduleGachas } from '@/lib/scrapers/gacha-island-schedule';

// 実行するタスク（正しい順序: 店舗リスト → 店舗ガチャ同期 → 発売スケジュール）
// #19: IpName/IpCategory の link は各スクレイパーが upsert 時に resolveIpNameId で実施するため、
//      後処理 syncIpNameTable は定常タスクから除外（既存分の一括 link は移行時に一度だけ実行）。
const GACHA_TASKS = [
  () => scrapeKansaiShops(),   // shops（Spot作成）
  () => syncShopGachas(),      // shop-sync（店舗×ガチャ）
  () => syncScheduleGachas(),  // schedule（予定ガチャ補完）
];

/** 手動/定期実行: shops → shop-sync → schedule を1回だけ順番に実行 */
export function runGachaScraping(): Promise<void> {
  return runSequential(GACHA_TASKS, 'gacha-island(manual)');
}
