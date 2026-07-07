import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const STOCK_PER_PAGE = 20;
const POSTS_PER_PAGE = 5;

const GACHA_SELECT = { id: true, ipName: true, seriesName: true, gradientFrom: true, gradientTo: true, imageUrl: true };
const USER_SELECT  = { id: true, name: true, image: true };
const SPOT_SELECT  = { id: true, name: true, address: true, lat: true, lng: true };

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ items: [], nextPage: null }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const type    = searchParams.get('type') ?? 'recommended';
    const page    = parseInt(searchParams.get('page') ?? '0', 10);
    const userLat = parseFloat(searchParams.get('lat') ?? '');
    const userLng = parseFloat(searchParams.get('lng') ?? '');
    const hasPos  = !isNaN(userLat) && !isNaN(userLng);
    const dist    = (spotLat: number, spotLng: number) =>
      hasPos ? haversine(userLat, userLng, spotLat, spotLng) : 0;

    // ── ユーザーのいいね済みガチャ & IP を取得（優先度判定用）──────────────
    const likedGachas = await prisma.gachaLike.findMany({
      where: { userId },
      select: { gachaId: true, gacha: { select: { ipName: true } } },
    });
    const likedIdSet    = new Set(likedGachas.map((g) => g.gachaId));
    const likedIpSet    = new Set(likedGachas.map((g) => g.gacha.ipName));

    // 優先度: 0=いいね済みガチャ, 1=いいね済みIP(ガチャは外), 2=それ以外
    const priority = (gachaId: string, ipName: string): number => {
      if (likedIdSet.has(gachaId)) return 0;
      if (likedIpSet.has(ipName))  return 1;
      return 2;
    };

    // ── フォロー中フィルター & 検索フィルター ─────────────────────────────
    let extraFilter: Record<string, unknown> = {};
    if (type === 'following') {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      extraFilter = { userId: { in: [userId, ...follows.map((f) => f.followingId)] } };
    } else if (type === 'search') {
      const gachaIdsParam = searchParams.get('gachaIds') ?? '';
      const gids = gachaIdsParam ? gachaIdsParam.split(',').filter(Boolean) : [];
      if (gids.length > 0) extraFilter = { gachaId: { in: gids } };
    }

    const baseWhere = { isPublic: true, ...extraFilter };

    // ── 在庫ポスト取得 ────────────────────────────────────────────────────
    const rawStock = await prisma.stockPost.findMany({
      where: baseWhere,
      include: {
        user:   { select: USER_SELECT },
        spot:   { select: SPOT_SELECT },
        gacha:  { select: GACHA_SELECT },
        _count: { select: { likes: true, replies: true } },
      },
    });

    // ── 通常ポスト取得 ────────────────────────────────────────────────────
    const rawPosts = await prisma.post.findMany({
      where: baseWhere,
      include: {
        user:   { select: USER_SELECT },
        spot:   { select: SPOT_SELECT },
        gacha:  { select: GACHA_SELECT },
        _count: { select: { likes: true, replies: true } },
      },
    });

    // ── 自分のいいね状態を取得 ─────────────────────────────────────────────
    const stockIds = rawStock.map((p) => p.id);
    const postIds  = rawPosts.map((p) => p.id);

    const [myStockLikes, myPostLikes] = await Promise.all([
      prisma.stockPostLike.findMany({ where: { userId, stockPostId: { in: stockIds } }, select: { stockPostId: true } }),
      prisma.like.findMany({         where: { userId, postId:      { in: postIds }  }, select: { postId: true } }),
    ]);

    const stockLikedSet = new Set(myStockLikes.map((l) => l.stockPostId));
    const postLikedSet  = new Set(myPostLikes.map((l) => l.postId));

    // ── 優先度ソート: tier → 近い順 ──────────────────────────────────────
    const sortedStock = rawStock
      .map((p) => ({ ...p, postType: 'stock' as const, likedByMe: stockLikedSet.has(p.id), _pri: priority(p.gachaId, p.gacha.ipName), _dist: dist(p.spot.lat, p.spot.lng) }))
      .sort((a, b) => a._pri - b._pri || a._dist - b._dist);

    const sortedPosts = rawPosts
      .map((p) => ({ ...p, postType: 'post' as const, likedByMe: postLikedSet.has(p.id), _pri: priority(p.gachaId, p.gacha.ipName), _dist: dist(p.spot.lat, p.spot.lng) }))
      .sort((a, b) => a._pri - b._pri || a._dist - b._dist);

    // ── ページネーション: 1ページ = 在庫20件 + 通常5件 ───────────────────
    const stockSlice = sortedStock.slice(page * STOCK_PER_PAGE, (page + 1) * STOCK_PER_PAGE);
    const postsSlice = sortedPosts.slice(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE);

    // _pri, _dist を除いて返す
    const items = [
      ...stockSlice.map(({ _pri, _dist, ...p }) => p),
      ...postsSlice.map(({ _pri, _dist, ...p }) => p),
    ];

    const hasMoreStock = sortedStock.length > (page + 1) * STOCK_PER_PAGE;
    const hasMorePosts = sortedPosts.length > (page + 1) * POSTS_PER_PAGE;
    const nextPage     = hasMoreStock || hasMorePosts ? page + 1 : null;

    return NextResponse.json({ items, nextPage });
  } catch (e) {
    console.error('[feed]', e);
    return NextResponse.json({ items: [], nextPage: null }, { status: 500 });
  }
}
