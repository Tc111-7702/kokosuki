import 'dotenv/config';
import { watch } from 'node:fs';
import path from 'node:path';
import { startGachaScraping } from '@/lib/scrapers/gacha-island';
import { startPhoneScraping } from '@/lib/scrapers/phone';
import { getSchedule } from '@/lib/scrapeSchedule';

// 常駐ワーカー: Vercel ではなく常駐 Node プロセスで実行すること。
//   起動例: npm run worker
// 予約設定は scrape-schedule.json（管理画面の「予約」ボタンで保存）を読み込んで反映する。
// さらにこのファイルを監視し、変更を検知したら再起動なしで予約を組み直す。

let stopGacha: (() => void) | null = null;
let stopPhone: (() => void) | null = null;

async function applySchedules(reason: string): Promise<void> {
  const [gacha, phone] = await Promise.all([getSchedule('gacha'), getSchedule('phone')]);
  // 既存の予約を停止してから新しい設定で組み直す
  stopGacha?.();
  stopPhone?.();
  stopGacha = startGachaScraping(gacha);
  stopPhone = startPhoneScraping(phone);
  console.log(`[worker] スケジュール適用(${reason}):`);
  console.log(`[worker]   gacha: ${gacha.everyWeeks}週間ごと 曜日=${gacha.dayOfWeek} ${gacha.atTime}`);
  console.log(`[worker]   phone: ${phone.everyWeeks}週間ごと 曜日=${phone.dayOfWeek} ${phone.atTime}`);
}

await applySchedules('起動時');
console.log('[worker] スクレイピングのポーリングを開始しました。設定変更を監視します…');

// scrape-schedule.json の変更を監視して再スケジュール（連続イベントはデバウンス）。
// ファイル未作成でも拾えるよう、プロジェクトルート(直下)を監視してファイル名で絞り込む。
const SCHEDULE_FILENAME = 'scrape-schedule.json';
let debounce: ReturnType<typeof setTimeout> | null = null;
try {
  watch(path.join(process.cwd()), (_event, filename) => {
    if (filename !== SCHEDULE_FILENAME) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      applySchedules('設定変更を検知').catch((e) => console.error('[worker] 再スケジュール失敗:', e));
    }, 300);
  });
} catch (e) {
  console.warn('[worker] 設定ファイル監視を開始できませんでした。予約変更は worker 再起動で反映されます。', e);
}

// イベントループを生かし続ける（setTimeout ベースのスケジュールを維持）
setInterval(() => { /* keep-alive */ }, 1 << 30);
