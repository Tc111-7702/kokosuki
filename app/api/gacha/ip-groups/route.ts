import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/gacha/ip-groups
// { anime: [{ipName, count}], character: [{ipName, count}], other: [{ipName, count}] }
export async function GET() {
  try {
    const rows = await prisma.gacha.groupBy({
      by: ['ipName', 'ipCategory'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const anime: { ipName: string; count: number }[] = [];
    const character: { ipName: string; count: number }[] = [];
    const other: { ipName: string; count: number }[] = [];

    // ipNameごとに集計（同じipNameが複数ipCategoryに跨ぐ場合は多数派に）
    const map = new Map<string, { anime: number; character: number; other: number }>();
    for (const r of rows) {
      const key = r.ipName;
      if (!map.has(key)) map.set(key, { anime: 0, character: 0, other: 0 });
      const entry = map.get(key)!;
      const cat = r.ipCategory as 'anime' | 'character' | 'other';
      entry[cat] = (entry[cat] ?? 0) + r._count.id;
    }

    for (const [ipName, counts] of map) {
      const total = counts.anime + counts.character + counts.other;
      const dominant =
        counts.anime >= counts.character && counts.anime >= counts.other ? 'anime'
        : counts.character >= counts.other ? 'character'
        : 'other';
      const item = { ipName, count: total };
      if (dominant === 'anime') anime.push(item);
      else if (dominant === 'character') character.push(item);
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
