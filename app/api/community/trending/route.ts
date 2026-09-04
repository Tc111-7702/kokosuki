import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET() {
  try {
    // ガチャ別いいね数（降順）
    const gachas = await db.getGachasWithLikeCount();

    // 話題のガチャ top 3
    const trendingGachas = gachas.slice(0, 3).map((g) => ({
      id: g.id,
      seriesName: g.seriesName,
      ipName: g.ipName,
      imageUrl: g.imageUrl,
      gradientFrom: g.gradientFrom,
      gradientTo: g.gradientTo,
      likeCount: g._count.gachaLikes,
    }));

    // 話題のIP: ipName ごとにいいね数を合計
    const ipMap = new Map<string, {
      likeCount: number;
      imageUrl: string | null;
      gradientFrom: string;
      gradientTo: string;
    }>();

    for (const g of gachas) {
      if (!g.ipName) continue; // 未link（除外ipName）のガチャは「話題のIP」に出さない
      const cur = ipMap.get(g.ipName);
      if (cur) {
        cur.likeCount += g._count.gachaLikes;
        if (!cur.imageUrl && g.imageUrl) cur.imageUrl = g.imageUrl;
      } else {
        ipMap.set(g.ipName, {
          likeCount: g._count.gachaLikes,
          imageUrl: g.imageUrl,
          gradientFrom: g.gradientFrom,
          gradientTo: g.gradientTo,
        });
      }
    }

    const trendingIPs = Array.from(ipMap.entries())
      .map(([ipName, data]) => ({ ipName, ...data }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5);

    return NextResponse.json({ trendingGachas, trendingIPs });
  } catch (e) {
    console.error('[trending]', e);
    return NextResponse.json({ trendingGachas: [], trendingIPs: [] });
  }
}
