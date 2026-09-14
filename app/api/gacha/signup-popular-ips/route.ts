import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

/** GET /api/gacha/signup-popular-ips — 新規登録 IP 選択用（総いいね数順 + 各 IP の代表ガチャ画像） */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ipNames = searchParams.getAll('ipName');

  try {
    if (ipNames.length > 0) {
      const ips = await db.getTopGachaImageByIpNames(ipNames);
      return NextResponse.json({ ips }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const parsed = parseInt(searchParams.get('limit') ?? '9', 10);
    const limit = Number.isFinite(parsed) ? Math.min(20, Math.max(1, parsed)) : 9;
    const ips = await db.getPopularIpsWithTopGachaImage(limit);
    return NextResponse.json({ ips }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[/api/gacha/signup-popular-ips]', e);
    return NextResponse.json({ ips: [] }, { status: 500 });
  }
}
