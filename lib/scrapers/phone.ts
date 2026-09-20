import { runSequential } from '@/lib/scrapers/runSequential';
import { fetchPlaceIds } from '@/lib/scrapers/place-id-fetch';
import { fetchPhoneNumbers } from '@/lib/scrapers/phone-fetch';

// 実行するタスク（正しい順序: Place ID 取得 → 電話番号取得）
const PHONE_TASKS = [
  () => fetchPlaceIds(),      // place-id
  () => fetchPhoneNumbers(),  // phone-fetch
];

/** 手動/定期実行: place-id → phone-fetch を1回だけ順番に実行 */
export function runPhoneScraping(): Promise<void> {
  return runSequential(PHONE_TASKS, 'phone(manual)');
}
