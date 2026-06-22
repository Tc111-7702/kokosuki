import { NextResponse } from 'next/server';
import { scrapeKansaiMachines } from '@/lib/scrapers/gacha-island-machines';

export const maxDuration = 300;

function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

// Vercel Cron から呼ばれる
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await scrapeKansaiMachines();
  return NextResponse.json({ ok: true, ...result });
}

// 手動実行用
export async function POST() {
  const result = await scrapeKansaiMachines();
  return NextResponse.json({ ok: true, ...result });
}
