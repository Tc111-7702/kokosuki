import 'dotenv/config';
import { prisma } from '@/lib/db';
import { runGachaScraping } from '@/lib/scrapers/gacha-island';
import { runPhoneScraping } from '@/lib/scrapers/phone';
import type { ScrapeType } from '@/lib/scrapeSchedule';

// GitHub Actions から定期的に呼ばれるハートビート用ランナー。
// DBの予約(ScrapeSchedule)を見て「今実行すべきか(due)」を判定し、
// due のときだけロックを取ってスクレイプ本体を1回実行する。
// 予約時刻はJST。日本はDST無しなので固定+9hでよい。
//
// 既存の常駐worker(scraperPolling)とは独立。将来workerを退役してもこちらだけで回る。

const RUNNERS: Record<ScrapeType, () => Promise<void>> = {
  gacha: runGachaScraping,
  phone: runPhoneScraping,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2時間で古いロックを失効
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;   // 日本はDST無しなので固定+9h

/** 「今日の atTime(JST)」を絶対時刻(Date)で返す。atTime は "HH:MM"。 */
function scheduledTodayJst(atTime: string, now: Date): Date {
  const [h, m] = atTime.split(':').map((v) => parseInt(v, 10));
  const jst = new Date(now.getTime() + JST_OFFSET_MS); // JSTの壁時計
  const y = jst.getUTCFullYear();
  const mo = jst.getUTCMonth();
  const d = jst.getUTCDate();
  return new Date(Date.UTC(y, mo, d, Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0) - JST_OFFSET_MS);
}

/**
 * due判定＋ロック取得を updateMany（1本のUPDATE）で原子的に行う。
 * count>0 なら「このプロセスが実行権を取得」＝実行してよい。
 * 同時実行が来ても、ロック条件をWHEREに入れているので1本しか通らない。
 */
async function claimDueRun(type: ScrapeType, now: Date): Promise<boolean> {
  const row = await prisma.scrapeSchedule.findUnique({ where: { type } });
  if (!row) return false;

  // 条件1：今日の atTime(JST) を過ぎているか
  const scheduled = scheduledTodayJst(row.atTime, now);
  if (now < scheduled) return false;

  // 条件2の閾値：前回実行が「今日のatTime −(everyDays−1)日」より前か（未実行含む）
  const dueThreshold = new Date(scheduled.getTime() - Math.max(row.everyDays - 1, 0) * DAY_MS);
  // 条件3の閾値：この時刻より古いロックは失効扱い
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  const res = await prisma.scrapeSchedule.updateMany({
    where: {
      type,
      OR: [{ lastRunAt: null }, { lastRunAt: { lt: dueThreshold } }],       // 条件2
      AND: [{ OR: [{ lockedAt: null }, { lockedAt: { lt: staleLock } }] }], // 条件3
    },
    data: { lockedAt: now },
  });
  return res.count > 0;
}

/** 実行結果を反映。成功時のみ lastRunAt を進める。失敗時はロックだけ解放し次tickで再試行。 */
async function finishRun(type: ScrapeType, ok: boolean): Promise<void> {
  await prisma.scrapeSchedule.update({
    where: { type },
    data: ok ? { lastRunAt: new Date(), lockedAt: null } : { lockedAt: null },
  });
}

async function main() {
  const now = new Date();
  const types: ScrapeType[] = ['gacha', 'phone'];
  let ranAny = false;

  for (const type of types) {
    let claimed = false;
    try {
      claimed = await claimDueRun(type, now);
    } catch (e) {
      console.error(`[scrape-cron] ${type}: due判定に失敗（DB接続断など）→ skip`, e);
      process.exitCode = 1;
      continue;
    }
    if (!claimed) {
      console.log(`[scrape-cron] ${type}: 実行不要 or ロック中 → skip`);
      continue;
    }

    ranAny = true;
    console.log(`[scrape-cron] ${type}: due → 実行開始 ${new Date().toISOString()}`);
    try {
      await RUNNERS[type]();
      await finishRun(type, true);
      console.log(`[scrape-cron] ${type}: 成功`);
    } catch (e) {
      await finishRun(type, false).catch(() => undefined);
      console.error(`[scrape-cron] ${type}: 失敗（ロック解放・次回リトライ）`, e);
      process.exitCode = 1;
    }
  }

  if (!ranAny) console.log('[scrape-cron] 今回のtickでは実行対象なし');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => { console.error('[scrape-cron] 致命的エラー', e); process.exit(1); });
