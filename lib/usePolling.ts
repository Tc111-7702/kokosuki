'use client';

import { useEffect, useRef } from 'react';

type Task = () => Promise<unknown> | unknown;

/**
 * 一定秒ごとに関数群を「順番に（前の完了を待って次）」実行するクライアント用ポーリングフック。
 * - tasks: 実行する関数の配列（1つでも配列で渡す）。配列順に直列実行。
 * - seconds <= 0 で無効。
 * 例) usePolling([load, cleanup], 30) → 30秒ごとに load → 完了後 cleanup
 */
export function usePolling(tasks: Task[], seconds: number): void {
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (!seconds || seconds <= 0) return;
    const run = async () => {
      for (const task of tasksRef.current) {
        try {
          await task();
        } catch {
          /* 個々のタスクの失敗は無視して次へ */
        }
      }
    };
    const id = setInterval(run, seconds * 1000);
    return () => clearInterval(id);
  }, [seconds]);
}
