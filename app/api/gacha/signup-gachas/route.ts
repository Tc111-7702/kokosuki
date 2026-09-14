import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

/** GET /api/gacha/signup-gachas?ipNames=a,b&limit=4 — 各 IP ごとにいいね数上位のガチャ */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ipNames = (searchParams.get('ipNames') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const parsed = parseInt(searchParams.get('limit') ?? '4', 10);
  const limit = Number.isFinite(parsed) ? Math.min(20, Math.max(1, parsed)) : 4;

  if (ipNames.length === 0) {
    return NextResponse.json({ groups: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const groups = await db.getTopGachasByIpNamesForSignup(ipNames, limit);
    return NextResponse.json({ groups }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[/api/gacha/signup-gachas]', e);
    return NextResponse.json({ groups: [] }, { status: 500 });
  }
}
