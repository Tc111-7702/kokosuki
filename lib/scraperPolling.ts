// 常駐 Node プロセス用のスクレイピング・スケジューラ。
// 「毎 everyWeeks 週間、指定曜日 dayOfWeek の時刻 atTime」に tasks を配列順で直列実行する。
// scraperPolling は「停止関数」を返す。設定変更時は stop() してから再度呼ぶことで予約を組み直せる。
// ※ Vercel サーバーレスでは動きません（プロセスが常駐している環境で使うこと）。

type Task = () => Promise<unknown>;

export interface ScraperPollingOptions {
  tasks: Task[];        // 実行する関数群（配列の順に直列実行）
  everyWeeks: number;   // a: 何週間ごとに繰り返すか
  dayOfWeek: number;    // 実行曜日（0=日, 1=月, … 6=土）
  atTime: string;       // b: 実行時刻 "HH:MM"（24h表記）
  label?: string;
}

const MAX_DELAY = 2 ** 31 - 1; // setTimeout の上限(約24.8日)。週単位はこれを超えるのでチャンク化する

/** tasks を配列順に「1つずつ完了(resolved)を待って」直列実行する（手動実行・ポーリング共通） */
export async function runSequential(tasks: Task[], label = 'scraper'): Promise<void> {
  console.log(`[${label}] ▶ 開始 ${new Date().toISOString()}`);
  for (const task of tasks) {
    try {
      await task();
    } catch (e) {
      console.error(`[${label}] タスクエラー:`, e);
    }
  }
  console.log(`[${label}] ✔ 完了`);
}

/** 現在時刻から見て「次に dayOfWeek 曜日の atTime になる瞬間」の絶対時刻(ms) */
function nextOccurrence(dayOfWeek: number, atTime: string): number {
  const [h, m] = atTime.split(':').map((v) => parseInt(v, 10));
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  let dayDiff = ((dayOfWeek - next.getDay()) % 7 + 7) % 7;
  // 当日で既に時刻を過ぎている場合は翌週の同曜日へ
  if (dayDiff === 0 && next.getTime() <= now.getTime()) dayDiff = 7;
  next.setDate(next.getDate() + dayDiff);
  return next.getTime();
}

/**
 * 定期ポーリングを開始し、「停止関数」を返す。
 * 返された stop() を呼ぶと次回以降の予約をキャンセルする
 * （すでに実行中のタスク列は最後まで走ってから止まる）。
 * 設定変更時は stop() → もう一度 scraperPolling() で新しい予約に組み直せる。
 */
export function scraperPolling({ tasks, everyWeeks, dayOfWeek, atTime, label = 'scraper' }: ScraperPollingOptions): () => void {
  const intervalMs = everyWeeks * 7 * 24 * 60 * 60 * 1000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  // 絶対時刻 timestamp に fn を実行（長い遅延は分割して setTimeout の上限を回避 / キャンセル可能）
  const scheduleAt = (timestamp: number, fn: () => void): void => {
    if (stopped) return;
    const delay = timestamp - Date.now();
    if (delay <= 0) { fn(); return; }
    timer = setTimeout(
      delay > MAX_DELAY ? () => scheduleAt(timestamp, fn) : fn,
      Math.min(delay, MAX_DELAY),
    );
  };

  const cycle = (scheduledTs: number): void => {
    if (stopped) return;
    runSequential(tasks, label).finally(() => {
      if (stopped) return;
      const nextTs = scheduledTs + intervalMs;
      scheduleAt(nextTs, () => cycle(nextTs));
    });
  };

  const firstTs = nextOccurrence(dayOfWeek, atTime);
  console.log(`[${label}] 初回=${new Date(firstTs).toISOString()} / 以降 ${everyWeeks} 週間ごと 曜日=${dayOfWeek} ${atTime}`);
  scheduleAt(firstTs, () => cycle(firstTs));

  return () => {
    stopped = true;
    if (timer) { clearTimeout(timer); timer = null; }
  };
}
