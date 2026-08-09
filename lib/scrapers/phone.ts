import { scraperPolling, runSequential } from '@/lib/scraperPolling';
import { fetchPlaceIds } from '@/lib/scrapers/place-id-fetch';
import { fetchPhoneNumbers } from '@/lib/scrapers/phone-fetch';

// デフォルト設定（あとで start/run の引数で上書き可）
export const PHONE_DEFAULT = {
  everyWeeks: 4,      // a: 4週間ごと
  dayOfWeek: 0,       // 実行曜日（0=日曜）
  atTime: '04:00',    // b: 実行時刻（ガチャ側とずらす）
};

// 実行するタスク（正しい順序: Place ID 取得 → 電話番号取得）
const PHONE_TASKS = [
  () => fetchPlaceIds(),      // place-id
  () => fetchPhoneNumbers(),  // phone-fetch
];

/** 定期ポーリング開始（常駐プロセス用） */
export function startPhoneScraping(
  opts: { everyWeeks?: number; dayOfWeek?: number; atTime?: string } = {},
): void {
  scraperPolling({
    label: 'phone',
    everyWeeks: opts.everyWeeks ?? PHONE_DEFAULT.everyWeeks,
    dayOfWeek:  opts.dayOfWeek  ?? PHONE_DEFAULT.dayOfWeek,
    atTime:     opts.atTime     ?? PHONE_DEFAULT.atTime,
    tasks: PHONE_TASKS,
  });
}

/** 手動実行: place-id → phone-fetch を1回だけ順番に実行（ワンクリック用） */
export function runPhoneScraping(): Promise<void> {
  return runSequential(PHONE_TASKS, 'phone(manual)');
}
