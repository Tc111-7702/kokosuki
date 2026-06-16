export type PollerFn = () => Promise<void>;

export interface PollerOptions {
  /** true にすると start() 直後に即実行する（デフォルト: false） */
  runImmediately?: boolean;
}

export interface Poller {
  start(options?: PollerOptions): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * 汎用ポーラー
 *
 * @param fn          定期実行する非同期関数
 * @param intervalMs  実行間隔（ミリ秒）
 *
 * @example
 * const poller = createPoller(myAsyncFn, 60_000);
 * poller.start({ runImmediately: true });
 * // ...
 * poller.stop();
 */
export function createPoller(fn: PollerFn, intervalMs: number): Poller {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function schedule() {
    timer = setTimeout(async () => {
      try {
        await fn();
      } catch (err) {
        console.error('[Poller] エラー:', err);
      }
      if (running) schedule();
    }, intervalMs);
  }

  return {
    start({ runImmediately = false } = {}) {
      if (running) return;
      running = true;
      if (runImmediately) {
        fn()
          .catch((err) => console.error('[Poller] 初回実行エラー:', err))
          .finally(() => { if (running) schedule(); });
      } else {
        schedule();
      }
    },

    stop() {
      running = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },

    isRunning: () => running,
  };
}
