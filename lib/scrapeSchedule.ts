// スクレイピング予約設定（DB管理）。
// admin が書き込み、この worker（ココスキ）が起動時に読み込んで start*Scraping に渡す。
// 以前は JSON ファイルだったが、別サーバ運用でも共有できるよう DB(ScrapeSchedule) へ移行。

import * as db from '@/lib/db';

export type ScrapeType = 'gacha' | 'phone';

export interface ScheduleConfig {
  everyDays: number; // 何日ごと（1〜7）
  atTime: string;    // 実行時刻 "HH:MM"
}

// 既定値（lib/scrapers/*.ts の *_DEFAULT と揃える）。gacha=毎日 / phone=7日ごと。
const DEFAULTS: Record<ScrapeType, ScheduleConfig> = {
  gacha: { everyDays: 1, atTime: '03:00' },
  phone: { everyDays: 7, atTime: '04:00' },
};

/** 予約設定を取得。未設定（DBに行が無い）なら既定値。 */
export async function getSchedule(type: ScrapeType): Promise<ScheduleConfig> {
  const row = await db.getScrapeSchedule(type);
  return row ? { everyDays: row.everyDays, atTime: row.atTime } : DEFAULTS[type];
}

/** 予約設定を保存（upsert）。 */
export async function setSchedule(type: ScrapeType, cfg: ScheduleConfig): Promise<void> {
  await db.upsertScrapeSchedule(type, cfg.everyDays, cfg.atTime);
}
