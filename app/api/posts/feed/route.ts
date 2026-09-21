import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// 1ページあたり: 在庫 最大15 / 通常 最大5（計20）。バケツごとに独立してページングする。
const STOCK_LIMIT = 15;
const FEED_LIMIT  = 5;

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ stock: [], feed: [], stockHasMore: false, feedHasMore: false }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'recommended';
    // バケツごとのオフセット。-1 は「そのバケツは尽きたので取得スキップ」の合図。
    const stockOffset = parseInt(searchParams.get('stockOffset') ?? '0', 10);
    const feedOffset  = parseInt(searchParams.get('feedOffset') ?? '0', 10);

    // 好み（パーソナライズ）用: いいね済みガチャID / そのIP名。DB の並び順 CASE に渡す。
    const likedGachas  = await db.getUserGachaLikesWithIp(userId);
    const likedGachaIds = [...new Set(likedGachas.map((g) => g.gachaId))];
    const likedIps      = [...new Set(likedGachas.map((g) => g.gacha.ipName))];

    // 対象ガチャの絞り込み: 検索(gachaIds) / 店舗ページ(filterGachaIds) / spotId。無ければ全件。
    let gachaIds: string[] = [];
    if (type === 'search') {
      gachaIds = (searchParams.get('gachaIds') ?? '').split(',').filter(Boolean);
    }
    const filterSpotId        = searchParams.get('spotId');
    const filterGachaIdsStore = searchParams.get('filterGachaIds');
    if (gachaIds.length === 0 && filterGachaIdsStore) {
      gachaIds = filterGachaIdsStore.split(',').filter(Boolean);
    }
    // includeEnded: ガチャ詳細ページからの取得時のみ true（gacha/machine の status で絞らない）。
    const includeEnded = searchParams.get('includeEnded') === '1';
    const base = { spotId: filterSpotId, gachaIds, likedGachaIds, likedIps, includeEnded };

    // 1段目: 並び替え済みの ID を limit 件だけ取得（在庫は DISTINCT ON machineId ＋ 7日窓）。
    const [stockIds, postIds] = await Promise.all([
      stockOffset < 0 ? Promise.resolve([] as string[]) : db.getFeedStockIds({ ...base, limit: STOCK_LIMIT, offset: stockOffset }),
      feedOffset  < 0 ? Promise.resolve([] as string[]) : db.getFeedPostIds({ ...base, limit: FEED_LIMIT,  offset: feedOffset  }),
    ]);

    // 2段目: 本体を include 付きで取得（ID順に整列済み）＋ 自分のいいねを付与。
    const [stockRows, postRows, myStockLikes, myPostLikes] = await Promise.all([
      db.getStockPostsByIds(stockIds),
      db.getPostsByIds(postIds),
      db.getStockPostLikedIds(userId, stockIds),
      db.getPostLikedIds(userId, postIds),
    ]);

    const stockLikedSet = new Set(myStockLikes.map((l) => l.stockPostId));
    const postLikedSet  = new Set(myPostLikes.map((l) => l.postId));

    const stock = stockRows.map((p) => ({ ...p, postType: 'stock' as const, likedByMe: stockLikedSet.has(p.id) }));
    const feed  = postRows.map((p)  => ({ ...p, postType: 'post'  as const, likedByMe: postLikedSet.has(p.id)  }));

    // 返した件数が limit ちょうど = まだ続きがあるかもしれない。limit 未満 = そのバケツは尽き。
    // （バケツ不足はそのまま許容し、あるだけ返す）
    const stockHasMore = stockIds.length === STOCK_LIMIT;
    const feedHasMore  = postIds.length === FEED_LIMIT;

    return NextResponse.json({ stock, feed, stockHasMore, feedHasMore });
  } catch (e) {
    console.error('[feed]', e);
    return NextResponse.json({ stock: [], feed: [], stockHasMore: false, feedHasMore: false }, { status: 500 });
  }
}
