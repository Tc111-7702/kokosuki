import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET /api/gacha/filters
export async function GET() {
  try {
    const data = await db.getGachaFilters();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[/api/gacha/filters]', e);
    return NextResponse.json({ ipNames: [], items: [] }, { status: 500 });
  }
}
