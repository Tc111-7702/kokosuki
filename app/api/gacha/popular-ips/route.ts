import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET /api/gacha/popular-ips  — いいね総数が多い順の IP 名（最大12件）
export async function GET() {
  try {
    const ipNames = await db.getPopularIpsByLikes(12);
    return NextResponse.json({ ipNames }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[/api/gacha/popular-ips]', e);
    return NextResponse.json({ ipNames: [] }, { status: 500 });
  }
}
