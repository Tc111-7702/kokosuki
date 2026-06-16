import { NextResponse } from 'next/server';
import { scrapeKansaiShops } from '@/lib/scrapers/gacha-island-shops';

// POST /api/scraper/gacha-island-shops
export async function POST() {
  const result = await scrapeKansaiShops();
  return NextResponse.json({ ok: true, ...result });
}
