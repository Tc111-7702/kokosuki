import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET /api/gacha/ip-groups
// { anime: [{ipName, count}], character: [{ipName, count}], other: [{ipName, count}] }
export async function GET() {
  try {
    const rows = await db.groupGachaByIpAndCategory();

    const anime: { ipName: string; count: number }[] = [];
    const character: { ipName: string; count: number }[] = [];
    const other: { ipName: string; count: number }[] = [];

    // #19: 各 IpName は単一カテゴリに属す。anime/character 以外（動物・食べ物・その他）は other にまとめる。
    for (const r of rows) {
      if (r._count.id === 0) continue;
      const item = { ipName: r.ipName, count: r._count.id };
      if (r.ipCategory === 'anime') anime.push(item);
      else if (r.ipCategory === 'character') character.push(item);
      else other.push(item);
    }

    // 件数降順ソート
    const byCount = (a: { count: number }, b: { count: number }) => b.count - a.count;
    anime.sort(byCount);
    character.sort(byCount);
    other.sort(byCount);

    return NextResponse.json({ anime, character, other }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e) {
    console.error('[/api/gacha/ip-groups]', e);
    return NextResponse.json({ anime: [], character: [], other: [] }, { status: 500 });
  }
}
