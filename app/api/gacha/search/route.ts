import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { expandQuery } from '@/lib/gacha-aliases';

// GET /api/gacha/search?q=xxx[&suggest=1]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const suggest = searchParams.get('suggest') === '1';

  if (!q.trim()) return NextResponse.json({ result: null, suggestions: [] });

  // エイリアス展開（例：ハンターハンター → ["HUNTER", "ハンターハンター"]）
  const terms = expandQuery(q);

  // Prisma OR 条件を組み立て
  const seriesWhere = terms.length === 1
    ? { seriesName: { contains: terms[0], mode: 'insensitive' as const } }
    : { OR: terms.map(t => ({ seriesName: { contains: t, mode: 'insensitive' as const } })) };

  const ipWhere = terms.length === 1
    ? { ipName: { contains: terms[0], mode: 'insensitive' as const } }
    : { OR: terms.map(t => ({ ipName: { contains: t, mode: 'insensitive' as const } })) };

  if (suggest) {
    const [series, ips] = await Promise.all([
      prisma.gacha.findMany({
        where: { isOnSale: true, ...seriesWhere },
        select: { seriesName: true },
        distinct: ['seriesName'],
        orderBy: { seriesName: 'asc' },
      }),
      prisma.gacha.findMany({
        where: { isOnSale: true, ...ipWhere },
        select: { ipName: true },
        distinct: ['ipName'],
        orderBy: { ipName: 'asc' },
      }),
    ]);
    return NextResponse.json({
      suggestions: [
        ...ips.map(g => ({ label: g.ipName, type: 'genre' as const })),
        ...series.map(g => ({ label: g.seriesName, type: 'gacha' as const })),
      ]
    });
  }

  // 1. ipName 完全一致 → ジャンル（最優先）
  const exactIpMatch = await prisma.gacha.findFirst({
    where: { isOnSale: true, ipName: { equals: q.trim(), mode: 'insensitive' } },
    select: { ipName: true },
  });
  if (exactIpMatch) {
    const ipMatches = await prisma.gacha.findMany({
      where: { isOnSale: true, ipName: { equals: exactIpMatch.ipName, mode: 'insensitive' } },
      select: { id: true, ipName: true },
    });
    return NextResponse.json({
      type: 'genre',
      label: exactIpMatch.ipName,
      ipName: exactIpMatch.ipName,
      gachaIds: ipMatches.map(g => g.id),
    });
  }

  // 2. シリーズ名で検索
  const seriesMatches = await prisma.gacha.findMany({
    where: { isOnSale: true, ...seriesWhere },
    select: { id: true, seriesName: true },
  });
  if (seriesMatches.length > 0) {
    return NextResponse.json({
      type: 'gacha',
      label: seriesMatches[0].seriesName,
      gachaIds: seriesMatches.map(g => g.id),
    });
  }

  // IPName（ジャンル）で検索
  const ipMatches = await prisma.gacha.findMany({
    where: { isOnSale: true, ...ipWhere },
    select: { id: true, ipName: true },
  });
  if (ipMatches.length > 0) {
    return NextResponse.json({
      type: 'genre',
      label: ipMatches[0].ipName,
      ipName: ipMatches[0].ipName,
      gachaIds: ipMatches.map(g => g.id),
    });
  }

  return NextResponse.json({ result: null });
}
