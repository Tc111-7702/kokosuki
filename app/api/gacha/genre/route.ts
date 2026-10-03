import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ipName = searchParams.get('ipName') ?? '';
  if (!ipName.trim()) return NextResponse.json({ gachas: [], ipName: '' });
  const rawLimit = Number(searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 1000) : 100;
  try {
    const gachas = await db.getGachasByIpName(ipName, limit);
    return NextResponse.json({ gachas, ipName });
  } catch (e) {
    console.error('[/api/gacha/genre]', e);
    return NextResponse.json({ gachas: [], ipName }, { status: 500 });
  }
}
