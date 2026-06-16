import { NextResponse } from 'next/server';
import { scrapeKansaiMachines } from '@/lib/scrapers/gacha-island-machines';

// POST /api/scraper/gacha-island-machines
export async function POST() {
  const result = await scrapeKansaiMachines();
  return NextResponse.json({ ok: true, ...result });
}
