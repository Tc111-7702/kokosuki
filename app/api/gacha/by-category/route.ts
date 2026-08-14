import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getCategoryIpNames } from '@/lib/wpCategories';

// ホームのカテゴリ別セクション用。?category=character|anime|other
//  character: キャラクター・マスコット / anime: アニメ・漫画・ゲーム / other: それ以外（食べ物・動物・その他）
//  発売中(isOnSale=true)のうち、いいね数上位10件を返す。分類は登録画面と同じWPカテゴリツリー基準。

type CardRow = Awaited<ReturnType<typeof db.getOnSaleGachasByIpNames>>[number];
const toItem = (g: CardRow) => ({
  id: g.id,
  seriesName: g.seriesName,
  ipName: g.ipName,
  imageUrl: g.imageUrl,
  gradientFrom: g.gradientFrom,
  gradientTo: g.gradientTo,
  likeCount: g._count.gachaLikes,
  status: g.status,
  releaseDate: g.releaseDate,
});

export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get('category');
  if (category !== 'character' && category !== 'anime' && category !== 'other') {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 });
  }

  try {
    const { character, anime } = await getCategoryIpNames();
    let rows: CardRow[];
    if (category === 'character') rows = await db.getOnSaleGachasByIpNames(character, 10);
    else if (category === 'anime') rows = await db.getOnSaleGachasByIpNames(anime, 10);
    else rows = await db.getOnSaleGachasNotInIpNames([...character, ...anime], 10);

    return NextResponse.json(
      { gachas: rows.map(toItem) },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (e) {
    console.error('[/api/gacha/by-category]', e);
    return NextResponse.json({ gachas: [] }, { status: 500 });
  }
}
