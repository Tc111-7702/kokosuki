// スクレイピング予約設定の永続化（JSONファイル）。
// API（Next サーバー）が書き込み、常駐 worker が起動時に読み込んで
// startGachaScraping / startPhoneScraping の引数（everyWeeks/dayOfWeek/atTime）に渡す。
// ※ ファイルシステムに書き込むため、自ホスト/ローカル運用が前提（Vercel サーバーレスでは永続化されない）。

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ScrapeType = 'gacha' | 'phone';

export interface ScheduleConfig {
  everyWeeks: number; // 何週間ごと（1〜4）
  dayOfWeek: number;  // 実行曜日（0=日 … 6=土）
  atTime: string;     // 実行時刻 "HH:MM"
}

const FILE = path.join(process.cwd(), 'scrape-schedule.json');

// 既定値（lib/scrapers/*.ts の *_DEFAULT と揃える）
const DEFAULTS: Record<ScrapeType, ScheduleConfig> = {
  gacha: { everyWeeks: 4, dayOfWeek: 0, atTime: '03:00' },
  phone: { everyWeeks: 4, dayOfWeek: 0, atTime: '04:00' },
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
    // 未作成・破損時は既定値
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
