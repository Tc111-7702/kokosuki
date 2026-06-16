import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/gacha/filters
// フィルターUI用: ipNames一覧 + ガチャ一覧(id, seriesName, ipName)
export async function GET() {
  const data = await db.getGachaFilters();
  return NextResponse.json(data);
}
