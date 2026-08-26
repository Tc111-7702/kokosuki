import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// Vercel Cron からのみ実行される。CRON_SECRET を Bearer で検証（未設定なら常に拒否）。
function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

// 保持期間: 既読かつ作成から30日経過した通知を削除（24hは短すぎるため1ヶ月に緩和）
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

async function cleanup() {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const { count } = await db.deleteReadNotificationsBefore(cutoff);
  return count;
}

// Vercel Cron（GET）から1日1回呼ばれる（vercel.json の crons 設定）。
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const deleted = await cleanup();
  return NextResponse.json({ ok: true, deleted });
}
