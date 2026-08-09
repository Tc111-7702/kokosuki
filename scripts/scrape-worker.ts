import 'dotenv/config';
import { startGachaScraping } from '@/lib/scrapers/gacha-island';
import { startPhoneScraping } from '@/lib/scrapers/phone';

// 常駐ワーカー: Vercel ではなく常駐 Node プロセスで実行すること。
//   起動例: npm run worker
// 頻度・時刻を変えたい場合は引数で上書き:
//   startGachaScraping({ everyWeeks: 2, atTime: '03:30' })

startGachaScraping();
startPhoneScraping();

console.log('[worker] スクレイピングのポーリングを開始しました。プロセスを常駐させます…');

// イベントループを生かし続ける（setTimeout ベースのスケジュールを維持）
setInterval(() => { /* keep-alive */ }, 1 << 30);
