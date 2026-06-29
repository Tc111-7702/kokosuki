import { NextResponse } from 'next/server';
import { scrapeGachaIsland } from '@/lib/scrapers/gacha-island';

export async function GET() {
  const result = await scrapeGachaIsland(2);
  return NextResponse.json({ ok: true, ...result });
}
