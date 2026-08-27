import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { expandQuery } from '@/lib/gacha-aliases';

// GET /api/gacha/search?q=xxx[&suggest=1]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const suggest = searchParams.get('suggest') === '1';

  if (!q.trim()) return NextResponse.json({ result: null, suggestions: [] });

  // エイリアス展開（例：ハンターハンター → ["HUNTER", "ハンターハンター"]）
  const terms = expandQuery(q);

  if (suggest) {
    // IPチップ名と完全一致するipNameがあれば、配下のseriesNameをgachaとして返す
    const exactIpSeries = await db.findOnSaleSeriesByExactIp(q.trim());
    if (exactIpSeries.length > 0) {
      return NextResponse.json({
        suggestions: exactIpSeries.map(g => ({ id: g.id, label: g.seriesName, type: 'gacha' as const, imageUrl: g.imageUrl })),
      });
    }

    const [series, ips] = await Promise.all([
      db.suggestGachaSeries(terms),
      db.suggestGachaIps(terms),
    ]);
    return NextResponse.json({
      suggestions: [
        ...ips.map(g => ({ label: g.ipName, type: 'genre' as const, imageUrl: null })),
        ...series.map(g => ({ id: g.id, label: g.seriesName, type: 'gacha' as const, imageUrl: g.imageUrl })),
      ]
    });
  }

  // 1. ipName 完全一致 → ジャンル（最優先）
  const exactIpMatch = await db.findOnSaleExactIp(q.trim());
  if (exactIpMatch) {
    const ipMatches = await db.findGachaIdsByExactIp(exactIpMatch.ipName);
    return NextResponse.json({
      type: 'genre',
      label: exactIpMatch.ipName,
      ipName: exactIpMatch.ipName,
      gachaIds: ipMatches.map(g => g.id),
    });
  }

  // 2. シリーズ名で検索
  const seriesMatches = await db.findGachaIdsBySeriesTerms(terms);
  if (seriesMatches.length > 0) {
    return NextResponse.json({
      type: 'gacha',
      label: seriesMatches[0].seriesName,
      gachaIds: seriesMatches.map(g => g.id),
    });
  }

  // IPName（ジャンル）で検索
  const ipMatches = await db.findGachaIdsByIpTerms(terms);
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
