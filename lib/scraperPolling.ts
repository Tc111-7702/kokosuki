// 常駐 Node プロセス用のスクレイピング・スケジューラ。
// 「everyDays 日ごと、時刻 atTime」に tasks を配列順で直列実行する。
// ※ Vercel サーバーレスでは動きません（プロセスが常駐している環境で使うこと）。

type Task = () => Promise<unknown>;

export interface ScraperPollingOptions {
  tasks: Task[];      // 実行する関数群（配列の順に直列実行）
  everyDays: number;  // 何日ごとに繰り返すか（1〜7）
  atTime: string;     // 実行時刻 "HH:MM"（24h表記）
  label?: string;
}

// ポーリングを止めるためのハンドル。予約設定の変更時に stop() で古いタイマーを解除し、
// 新しい設定で scraperPolling を張り直す（worker が使う）。
export interface ScraperPollingHandle {
  stop: () => void;
}

const MAX_DELAY = 2 ** 31 - 1; // setTimeout の上限(約24.8日)。長い遅延はチャンク化する

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

/**
 * 絶対時刻 timestamp に fn を実行（長い遅延は分割して setTimeout の上限を回避）。
 * 返り値の cancel() で保留中のタイマーを解除できる。
 */
function scheduleAt(timestamp: number, fn: () => void): { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const delay = timestamp - Date.now();
    if (delay <= 0) { fn(); return; }
    // 上限を超える遅延はチャンク化。再アームで timer を更新するので cancel は常に最新を解除する。
    timer = delay > MAX_DELAY ? setTimeout(arm, MAX_DELAY) : setTimeout(fn, delay);
  };
  arm();
  return { cancel: () => clearTimeout(timer) };
}

/** 次に atTime になる瞬間の絶対時刻(ms)。今日の時刻を過ぎていれば翌日。 */
function nextAtTime(atTime: string): number {
  const [h, m] = atTime.split(':').map((v) => parseInt(v, 10));
  const now = new Date();
  const next = new Date(now);
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

export function scraperPolling({ tasks, everyDays, atTime, label = 'scraper' }: ScraperPollingOptions): ScraperPollingHandle {
  const days = Math.min(7, Math.max(1, Math.floor(everyDays) || 1));
  const intervalMs = days * 24 * 60 * 60 * 1000;

  let stopped = false;
  let pending: { cancel: () => void } | null = null;

  const cycle = (scheduledTs: number) => {
    if (stopped) return;
    runSequential(tasks, label).finally(() => {
      if (stopped) return; // 停止済みなら次回を張らない（実行中のものは最後まで走る）
      const nextTs = scheduledTs + intervalMs;
      pending = scheduleAt(nextTs, () => cycle(nextTs));
    });
  };

  const firstTs = nextAtTime(atTime);
  console.log(`[${label}] 初回=${new Date(firstTs).toISOString()} / 以降 ${days}日ごと ${atTime}`);
  pending = scheduleAt(firstTs, () => cycle(firstTs));

  return {
    stop: () => {
      stopped = true;
      pending?.cancel();
    },
  };
}
