import 'dotenv/config';
import { prisma } from '@/lib/db';
import { runGachaScraping } from '@/lib/scrapers/gacha-island';
import { runPhoneScraping } from '@/lib/scrapers/phone';
import type { ScrapeType } from '@/lib/scrapeSchedule';

// GitHub Actions から定期的に呼ばれるハートビート用ランナー。
// DBの予約(ScrapeSchedule)を見て「今実行すべきか(due)」を判定し、
// due のときだけロックを取ってスクレイプ本体を1回実行する。
// 予約時刻はJST。日本はDST無しなので Asia/Tokyo 固定でよい。
//
// 既存の常駐worker(scraperPolling)とは独立。将来workerを退役してもこちらだけで回る。
//
// ─ SQLメモ ─
// 「今日の atTime(JST)」を絶対時刻(timestamptz)にする式（AT TIME ZONE を2回使う）:
//   ( date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo')  -- 今日(JST)の0時（naive）
//     + s."atTime"::time )                                 -- + HH:MM
//   AT TIME ZONE 'Asia/Tokyo'                              -- JST壁時計→絶対時刻(timestamptz)
// 列 lastRunAt/lockedAt は timestamp(3)（tz無し・PrismaのUTC値）なので、比較時は
//   (s."col" AT TIME ZONE 'UTC') でUTC絶対時刻に直してから比較する（セッションTZ非依存）。

const RUNNERS: Record<ScrapeType, () => Promise<void>> = {
  gacha: runGachaScraping,
  phone: runPhoneScraping,
};

/**
 * due判定＋ロック取得を「1本の UPDATE ... RETURNING」で原子的に行う。
 * 返り行があれば「このプロセスが実行権を取得」＝実行してよい。
 * 条件: 今が今日のatTime(JST)以降 / 前回実行から everyDays 日以上（未実行含む）/ ロック空 or 2h失効
 */
async function claimDueRun(type: ScrapeType): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ type: string }[]>`
    UPDATE "ScrapeSchedule" s
    SET "lockedAt" = now() AT TIME ZONE 'UTC'
    WHERE s."type" = ${type}
      AND now() >= (
        (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + s."atTime"::time)
        AT TIME ZONE 'Asia/Tokyo'
      )
      AND (
        s."lastRunAt" IS NULL
        OR (s."lastRunAt" AT TIME ZONE 'UTC') < (
             (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + s."atTime"::time)
             AT TIME ZONE 'Asia/Tokyo'
           ) - make_interval(days => GREATEST(s."everyDays" - 1, 0))
      )
      AND (
        s."lockedAt" IS NULL
        OR (s."lockedAt" AT TIME ZONE 'UTC') < now() - interval '2 hours'
      )
    RETURNING s."type" AS type
  `;
  return rows.length > 0;
}

/** 実行結果を反映。成功時のみ lastRunAt を進める。失敗時はロックだけ解放し次tickで再試行。 */
async function finishRun(type: ScrapeType, ok: boolean): Promise<void> {
  if (ok) {
    await prisma.$executeRaw`
      UPDATE "ScrapeSchedule"
      SET "lastRunAt" = now() AT TIME ZONE 'UTC', "lockedAt" = NULL
      WHERE "type" = ${type}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "ScrapeSchedule" SET "lockedAt" = NULL WHERE "type" = ${type}
    `;
  }
}

async function main() {
  const types: ScrapeType[] = ['gacha', 'phone'];
  let ranAny = false;

  for (const type of types) {
    let claimed = false;
    try {
      claimed = await claimDueRun(type);
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
