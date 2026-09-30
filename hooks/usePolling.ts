'use client';

import { useEffect, useRef } from 'react';

type Task = () => Promise<unknown> | unknown;

/**
 * 一定秒ごとに関数群を「順番に（前の完了を待って次）」実行するクライアント用ポーリングフック。
 * - tasks: 実行する関数の配列（1つでも配列で渡す）。配列順に直列実行。
 * - seconds <= 0 で無効。
 * - タブ非表示中（document.hidden）はポーリングを停止し、表示復帰時に即1回実行して再開する。
 *   見えていない間の無駄なリクエストを避けつつ、復帰時の鮮度は保つ（背面 setInterval は
 *   ブラウザにスロットリングされるため、非表示中の更新に意味はない）。
 * 例) usePolling([load], 30) → 表示中は30秒ごとに load。非表示で停止、復帰で即 load＋再開。
 */
export function usePolling(tasks: Task[], seconds: number): void {
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (!seconds || seconds <= 0) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      for (const task of tasksRef.current) {
        try {
          await task();
        } catch {
          /* 個々のタスクの失敗は無視して次へ */
        }
      }
    };
    const start = () => { if (timer === null) timer = setInterval(run, seconds * 1000); };
    const stop  = () => { if (timer !== null) { clearInterval(timer); timer = null; } };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { run(); start(); }   // 復帰時に即1回＋再開
    };

    if (!document.hidden) start();   // 初期: 表示中のときだけ開始
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [seconds]);
}
