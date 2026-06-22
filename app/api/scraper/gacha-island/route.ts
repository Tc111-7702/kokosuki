import { NextResponse } from 'next/server';
import { scrapeGachaIsland } from '@/lib/scrapers/gacha-island';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagesParam = searchParams.get('pages');
  const maxPages = pagesParam ? Number(pagesParam) : undefined;

  const result = await scrapeGachaIsland(maxPages);

  return NextResponse.json({ ok: true, ...result });
}
