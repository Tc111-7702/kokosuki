import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const PER_PAGE = 20;

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

    const likedGachas = await prisma.gachaLike.findMany({
      where: { userId },
      select: { gachaId: true, gacha: { select: { ipName: true } } },
    });
    const likedIdSet = new Set(likedGachas.map((g) => g.gachaId));
    const likedIpSet = new Set(likedGachas.map((g) => g.gacha.ipName));

    const priority = (gachaId: string, ipName: string): number => {
      if (likedIdSet.has(gachaId)) return 0;
      if (likedIpSet.has(ipName))  return 1;
      return 2;
    };

    // 発売終了ガチャの投稿はホーム・ガチャページ・店舗ページに表示しない
    // （マイページは /api/mypage/posts で別途取得するためここでは除外）
    let extraFilter: Record<string, unknown> = {};
    if (type === 'search') {
      const gachaIdsParam = searchParams.get('gachaIds') ?? '';
      const gids = gachaIdsParam ? gachaIdsParam.split(',').filter(Boolean) : [];
      if (gids.length > 0) extraFilter = { gachaId: { in: gids } };
    }

    // 店舗ページ用フィルター（spotId / filterGachaIds）
    const filterSpotId        = searchParams.get('spotId');
    const filterGachaIdsStore = searchParams.get('filterGachaIds');
    let baseWhere: Record<string, unknown> = { isPublic: true, gacha: { isOnSale: true }, ...extraFilter };
    if (filterSpotId) baseWhere = { ...baseWhere, spotId: filterSpotId };
    if (filterGachaIdsStore && !(extraFilter as Record<string, unknown>).gachaId) {
      const gids = filterGachaIdsStore.split(',').filter(Boolean);
      if (gids.length > 0) baseWhere = { ...baseWhere, gachaId: { in: gids } };
    }

    const [rawStock, rawPosts] = await Promise.all([
      prisma.stockPost.findMany({
        where: baseWhere,
        include: {
          user:   { select: USER_SELECT },
          spot:   { select: SPOT_SELECT },
          gacha:  { select: GACHA_SELECT },
          _count: { select: { likes: true, replies: true } },
        },
      }),
      prisma.post.findMany({
        where: baseWhere,
        include: {
          user:   { select: USER_SELECT },
          spot:   { select: SPOT_SELECT },
          gacha:  { select: GACHA_SELECT },
          _count: { select: { likes: true, replies: true } },
        },
      }),
    ]);

    // 同一マシンの在庫投稿は最新のみ残す（重複排除）
    const machineLatest = new Map<string, typeof rawStock[0]>();
    for (const p of rawStock) {
      const ex = machineLatest.get(p.machineId);
      if (!ex || p.createdAt > ex.createdAt) machineLatest.set(p.machineId, p);
    }
    const dedupedStock = Array.from(machineLatest.values());

    const stockIds = dedupedStock.map((p) => p.id);
    const postIds  = rawPosts.map((p) => p.id);

    const [myStockLikes, myPostLikes] = await Promise.all([
      prisma.stockPostLike.findMany({ where: { userId, stockPostId: { in: stockIds } }, select: { stockPostId: true } }),
      prisma.like.findMany({         where: { userId, postId:      { in: postIds }  }, select: { postId: true } }),
    ]);

    const stockLikedSet = new Set(myStockLikes.map((l) => l.stockPostId));
    const postLikedSet  = new Set(myPostLikes.map((l) => l.postId));

    type AnyPost = { _pri: number; _dist: number; createdAt: Date; postType: 'stock' | 'post' };
    const allItems: AnyPost[] = [
      ...dedupedStock.map((p) => ({
        ...p, postType: 'stock' as const,
        likedByMe: stockLikedSet.has(p.id),
        _pri: priority(p.gachaId, p.gacha.ipName),
        _dist: dist(p.spot.lat, p.spot.lng),
      })),
      ...rawPosts.map((p) => ({
        ...p, postType: 'post' as const,
        likedByMe: postLikedSet.has(p.id),
        _pri: priority(p.gachaId, p.gacha.ipName),
        _dist: dist(p.spot.lat, p.spot.lng),
      })),
    ];

    // ソート: 在庫投稿優先 → 優先度 → 距離 → 新着順
    allItems.sort((a, b) => {
      const typeDiff = (a.postType === 'stock' ? 0 : 1) - (b.postType === 'stock' ? 0 : 1);
      if (typeDiff !== 0) return typeDiff;
      const priDiff  = a._pri - b._pri;
      if (priDiff !== 0) return priDiff;
      const distDiff = a._dist - b._dist;
      if (distDiff !== 0) return distDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const slice    = allItems.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const items    = slice.map(({ _pri, _dist, ...p }) => p);
    const nextPage = allItems.length > (page + 1) * PER_PAGE ? page + 1 : null;

    return NextResponse.json({ items, nextPage });
  } catch (e) {
    console.error('[feed]', e);
    return NextResponse.json({ items: [], nextPage: null }, { status: 500 });
  }
}
