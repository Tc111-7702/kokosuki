import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ホームのカテゴリ別セクション用。?category=character|anime|other
//  character: キャラクター・マスコット / anime: アニメ・漫画・ゲーム / other: それ以外（食べ物・動物・その他）
//  発売中(isOnSale=true)のうち、いいね数上位10件を返す。
//  #19: 分類は正規化済みの IpCategory リレーション（Gacha.ip.category.key）基準。

type CardRow = Awaited<ReturnType<typeof db.getOnSaleGachasByCategoryKeys>>[number];
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
    // お気に入り済みは表示しない（未ログインは除外なし）
    const session = await auth.api.getSession({ headers: await headers() });
    const excludeIds = session?.user?.id ? await db.getLikedGachaIds(session.user.id) : [];

    let rows: CardRow[];
    if (category === 'character') rows = await db.getOnSaleGachasByCategoryKeys(['character'], 10, excludeIds);
    else if (category === 'anime') rows = await db.getOnSaleGachasByCategoryKeys(['anime'], 10, excludeIds);
    else rows = await db.getOnSaleGachasNotInCategoryKeys(['character', 'anime'], 10, excludeIds);

    return NextResponse.json({ gachas: rows.map(toItem) });
  } catch (e) {
    console.error('[/api/gacha/by-category]', e);
    return NextResponse.json({ gachas: [] }, { status: 500 });
  }
}
