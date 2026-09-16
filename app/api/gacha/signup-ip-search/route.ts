import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { expandQuery } from '@/lib/gacha-aliases';

/** GET /api/gacha/signup-ip-search?q=xxx — 新規登録 IP 検索（エイリアス・かな展開・ガチャ数順・最大9件） */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  if (!q.trim()) {
    return NextResponse.json({ ips: [] });
  }

  const parsed = parseInt(searchParams.get('limit') ?? '9', 10);
  const limit = Number.isFinite(parsed) ? parsed : 9;
  const terms = expandQuery(q.trim());

  try {
    const ips = await db.searchSignupIpsByName(terms, limit);
    return NextResponse.json({ ips }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[/api/gacha/signup-ip-search]', e);
    return NextResponse.json({ ips: [] }, { status: 500 });
  }
}
