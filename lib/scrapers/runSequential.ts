// tasks を配列順に「1つずつ完了(resolved)を待って」直列実行する（一手系スクレイプ共通）。
type Task = () => Promise<unknown>;

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
