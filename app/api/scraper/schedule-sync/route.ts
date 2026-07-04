import { NextResponse } from 'next/server';
import { syncScheduleGachas } from '@/lib/scrapers/gacha-island-schedule';

export async function GET() {
  const result = await syncScheduleGachas();
  return NextResponse.json({ ok: true, ...result });
}
