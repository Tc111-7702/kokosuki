import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/gacha/filters
export async function GET() {
  try {
    const data = await db.getGachaFilters();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e) {
    console.error('[/api/gacha/filters]', e);
    return NextResponse.json({ ipNames: [], items: [] }, { status: 500 });
  }
}
