import { NextResponse } from 'next/server';
import { deleteReadNotificationsBefore } from '@/lib/db';

function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 既読かつ作成から24時間経過した通知を削除
async function cleanup() {
  const cutoff = new Date(Date.now() - DAY_MS);
  const { count } = await deleteReadNotificationsBefore(cutoff);
  return count;
}

// Vercel Cron から呼ばれる
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const deleted = await cleanup();
  return NextResponse.json({ ok: true, deleted });
}

// 手動実行用
export async function POST() {
  const deleted = await cleanup();
  return NextResponse.json({ ok: true, deleted });
}
