import { scraperPolling, runSequential } from '@/lib/scraperPolling';
import { fetchPlaceIds } from '@/lib/scrapers/place-id-fetch';
import { fetchPhoneNumbers } from '@/lib/scrapers/phone-fetch';

// デフォルト設定（あとで start/run の引数で上書き可）
// 店舗電話番号は頻繁に変わらないので既定は7日ごと。
export const PHONE_DEFAULT = {
  everyDays: 7,       // 何日ごと（1〜7）。既定=7日
  atTime: '04:00',    // 実行時刻（ガチャ側とずらす）
};

// 実行するタスク（正しい順序: Place ID 取得 → 電話番号取得）
const PHONE_TASKS = [
  () => fetchPlaceIds(),      // place-id
  () => fetchPhoneNumbers(),  // phone-fetch
];

/** 定期ポーリング開始（常駐プロセス用） */
export function startPhoneScraping(
  opts: { everyDays?: number; atTime?: string } = {},
): void {
  scraperPolling({
    label: 'phone',
    everyDays: opts.everyDays ?? PHONE_DEFAULT.everyDays,
    atTime:    opts.atTime    ?? PHONE_DEFAULT.atTime,
    tasks: PHONE_TASKS,
  });
}

/** 手動実行: place-id → phone-fetch を1回だけ順番に実行（ワンクリック用） */
export function runPhoneScraping(): Promise<void> {
  return runSequential(PHONE_TASKS, 'phone(manual)');
}
