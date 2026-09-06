// スクレイピング予約設定の永続化（JSONファイル）。
// admin が書き込み、この worker（mikke）が起動時に読み込んで start*Scraping に渡す。
// ※ ファイルシステム書き込み前提（常駐/自ホスト運用）。将来的には DB 化を検討。

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ScrapeType = 'gacha' | 'phone';

export interface ScheduleConfig {
  everyDays: number; // 何日ごと（1〜7）
  atTime: string;    // 実行時刻 "HH:MM"
}

const FILE = path.join(process.cwd(), 'scrape-schedule.json');

// 既定値（lib/scrapers/*.ts の *_DEFAULT と揃える）。gacha=毎日 / phone=7日ごと。
const DEFAULTS: Record<ScrapeType, ScheduleConfig> = {
  gacha: { everyDays: 1, atTime: '03:00' },
  phone: { everyDays: 7, atTime: '04:00' },
};

export async function getSchedules(): Promise<Record<ScrapeType, ScheduleConfig>> {
  try {
    const raw = await fs.readFile(FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Record<ScrapeType, Partial<ScheduleConfig>>>;
    return {
      gacha: { ...DEFAULTS.gacha, ...(parsed.gacha ?? {}) },
      phone: { ...DEFAULTS.phone, ...(parsed.phone ?? {}) },
    };
  } catch {
    return { gacha: { ...DEFAULTS.gacha }, phone: { ...DEFAULTS.phone } };
  }
}

export async function getSchedule(type: ScrapeType): Promise<ScheduleConfig> {
  return (await getSchedules())[type];
}

export async function setSchedule(type: ScrapeType, cfg: ScheduleConfig): Promise<void> {
  const all = await getSchedules();
  all[type] = cfg;
  await fs.writeFile(FILE, JSON.stringify(all, null, 2), 'utf-8');
}
