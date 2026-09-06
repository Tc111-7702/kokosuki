import 'dotenv/config';
import { startGachaScraping } from '@/lib/scrapers/gacha-island';
import { startPhoneScraping } from '@/lib/scrapers/phone';
import { getSchedule } from '@/lib/scrapeSchedule';

// 常駐ワーカー: Vercel ではなく常駐 Node プロセスで実行すること。
//   起動例: npm run worker
// 予約設定（DB: ScrapeSchedule）を起動時に読み込み、無ければ既定値（gacha=毎日/phone=7日）。
// 設定を変えたら worker を再起動すると反映される。
async function main() {
  const [gacha, phone] = await Promise.all([getSchedule('gacha'), getSchedule('phone')]);

  startGachaScraping({ everyDays: gacha.everyDays, atTime: gacha.atTime });
  startPhoneScraping({ everyDays: phone.everyDays, atTime: phone.atTime });

  console.log(
    `[worker] ポーリング開始: gacha=${gacha.everyDays}日ごと ${gacha.atTime} / phone=${phone.everyDays}日ごと ${phone.atTime}`,
  );

  // イベントループを生かし続ける（setTimeout ベースのスケジュールを維持）
  setInterval(() => { /* keep-alive */ }, 1 << 30);
}

main().catch((e) => { console.error('[worker] 起動エラー', e); process.exit(1); });
