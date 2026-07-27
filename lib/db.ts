import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrisma() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 60_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
    globalForPrisma.prisma = undefined;
  });
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export interface SpotUpsertData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
  phone: string | null;
  googleMapsUrl: string | null;
}

export interface GachaUpsertData {
  seriesName: string;
  ipName: string;
  kind: string;
  category: string;
  status: string;
  price: number;
  gradientFrom: string;
  gradientTo: string;
  genre: string | null;
  maker: string | null;
  imageUrl: string | null;
  releaseDate: Date | null;
  sourceUrl: string;
  wpPostId: number;
  lineup: string[];
  isOnSale: boolean;
}

// ─── UserProfile ─────────────────────────────────────────────────────────────

export const findProfileByHandle = (handle: string) =>
  prisma.userProfile.findUnique({ where: { handle } });

export const findProfileByUserId = (userId: string) =>
  prisma.userProfile.findUnique({ where: { userId } });

export const upsertProfile = (userId: string, handle: string) =>
  prisma.userProfile.upsert({
    where:  { userId },
    update: { handle },
    create: { userId, handle },
  });

// ─── GachaLike ───────────────────────────────────────────────────────────────

export const createGachaLikes = (userId: string, gachaIds: string[]) =>
  prisma.gachaLike.createMany({
    data: gachaIds.map((gachaId) => ({ userId, gachaId })),
    skipDuplicates: true,
  });

export const getGachaLike = (userId: string, gachaId: string) =>
  prisma.gachaLike.findUnique({
    where: { userId_gachaId: { userId, gachaId } },
  });

export async function toggleGachaLike(userId: string, gachaId: string) {
  const existing = await prisma.gachaLike.findUnique({
    where: { userId_gachaId: { userId, gachaId } },
  });
  if (existing) {
    await prisma.gachaLike.delete({ where: { userId_gachaId: { userId, gachaId } } });
    return { liked: false };
  } else {
    await prisma.gachaLike.create({ data: { userId, gachaId } });
    return { liked: true };
  }
}

export const getGachaLikeCount = (gachaId: string) =>
  prisma.gachaLike.count({ where: { gachaId } });

export const getLikedGachaIds = (userId: string) =>
  prisma.gachaLike
    .findMany({ where: { userId }, select: { gachaId: true } })
    .then((rows) => rows.map((r) => r.gachaId));

// ─── Spot ─────────────────────────────────────────────────────────────────────

export const getSpotById = (id: string) =>
  prisma.spot.findUnique({
    where: { id },
    include: { machines: { select: { gachaId: true, stockStatus: true } } },
  });

export const findSpotByGachaIslandId = (gachaIslandId: number) =>
  prisma.spot.findUnique({ where: { gachaIslandId } });

export const upsertSpotFromGachaIsland = (data: {
  gachaIslandId: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
}) =>
  prisma.spot.upsert({
    where:  { gachaIslandId: data.gachaIslandId },
    update: { name: data.name, address: data.address, lat: data.lat, lng: data.lng },
    create: {
      gachaIslandId: data.gachaIslandId,
      name:          data.name,
      address:       data.address,
      lat:           data.lat,
      lng:           data.lng,
    },
  });

export const upsertSpot = (data: SpotUpsertData) =>
  prisma.spot.upsert({
    where:  { googlePlaceId: data.googlePlaceId },
    update: {
      name:          data.name,
      address:       data.address,
      lat:           data.lat,
      lng:           data.lng,
      phone:         data.phone,
      googleMapsUrl: data.googleMapsUrl,
    },
    create: {
      name:          data.name,
      address:       data.address,
      lat:           data.lat,
      lng:           data.lng,
      googlePlaceId: data.googlePlaceId,
      phone:         data.phone,
      googleMapsUrl: data.googleMapsUrl,
    },
  });

export function findSpotsNearby(lat: number, lng: number, radiusMeters: number, addressContains?: string) {
  const delta = radiusMeters / 111_000;
  return prisma.spot.findMany({
    where: {
      lat: { gte: lat - delta, lte: lat + delta },
      lng: { gte: lng - delta, lte: lng + delta },
      ...(addressContains ? { address: { contains: addressContains } } : {}),
    },
    include: {
      machines: { select: { gachaId: true, stockStatus: true } },
    },
  });
}

export const findSpotsWithGachaIslandId = () =>
  prisma.spot.findMany({ where: { gachaIslandId: { not: null } } });

export const findSpotsWithPlaceId = () =>
  prisma.spot.findMany({
    where: { googlePlaceId: { not: null } },
    select: { id: true, googlePlaceId: true, phone: true },
  });

export const updateSpotPlaceId = (id: string, googlePlaceId: string) =>
  prisma.spot.update({ where: { id }, data: { googlePlaceId } });

export const findSpotsWithoutPlaceId = () =>
  prisma.spot.findMany({
    where: { gachaIslandId: { not: null }, googlePlaceId: null },
    select: { id: true, name: true, address: true, lat: true, lng: true },
  });

export const updateSpotPhone = (id: string, phone: string) =>
  prisma.spot.update({ where: { id }, data: { phone } });

// ─── Gacha ────────────────────────────────────────────────────────────────────

export async function getGachaFilters() {
  const items = await prisma.gacha.findMany({
    where: { isOnSale: true },
    select: { id: true, seriesName: true, ipName: true, imageUrl: true },
    orderBy: [{ ipName: 'asc' }, { seriesName: 'asc' }],
  });
  // ガチャ数が多い順にIPを並べる
  const countMap = new Map<string, number>();
  for (const g of items) {
    countMap.set(g.ipName, (countMap.get(g.ipName) ?? 0) + 1);
  }
  const ipNames = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ip]) => ip);
  return { ipNames, items };
}

export const findGachaByWpPostId = (wpPostId: number) =>
  prisma.gacha.findUnique({ where: { wpPostId } });

export const upsertGachaFromScraper = (data: GachaUpsertData) =>
  prisma.gacha.upsert({
    where:  { wpPostId: data.wpPostId },
    update: {
      seriesName:  data.seriesName,
      ipName:      data.ipName,
      genre:       data.genre,
      maker:       data.maker,
      imageUrl:    data.imageUrl,
      releaseDate: data.releaseDate,
      sourceUrl:   data.sourceUrl,
      status:      data.status,
      price:       data.price,
      lineup:      data.lineup,
      // isOnSale は true→false に絶対に戻さない
      // （店舗スクレイパーで true になったものをスケジュールスクレイパーが上書きしない）
      ...(data.isOnSale ? { isOnSale: true } : {}),
    },
    create: {
      seriesName:   data.seriesName,
      ipName:       data.ipName,
      kind:         data.kind,
      category:     data.category,
      status:       data.status,
      price:        data.price,
      gradientFrom: data.gradientFrom,
      gradientTo:   data.gradientTo,
      genre:        data.genre,
      maker:        data.maker,
      imageUrl:     data.imageUrl,
      releaseDate:  data.releaseDate,
      sourceUrl:    data.sourceUrl,
      wpPostId:     data.wpPostId,
      lineup:       data.lineup,
      isOnSale:     data.isOnSale,
    },
  });

export const getGachaById = (id: string) =>
  prisma.gacha.findUnique({
    where: { id },
    select: {
      id: true, seriesName: true, ipName: true, kind: true, category: true,
      status: true, price: true, gradientFrom: true, gradientTo: true,
      lineup: true, imageUrl: true, commentCount: true, weeklyPulls: true,
      postCount: true, isCollab: true, isReissue: true, isContinuation: true,
      genre: true, releaseDate: true, maker: true, sourceUrl: true,
    },
  });

export async function getPopularGachas(limit = 20) {
  const rows = await prisma.gacha.findMany({
    where: { isOnSale: true },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take: limit,
    select: {
      id: true, seriesName: true, ipName: true,
      imageUrl: true, gradientFrom: true, gradientTo: true,
      status: true, price: true,
      _count: { select: { gachaLikes: true } },
    },
  });
  return rows.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }));
}

export async function getRecommendedByLikedGachas(userId: string, perIp = 10) {
  // ユーザーのハート済みガチャとそのipNameを取得
  const likes = await prisma.gachaLike.findMany({
    where: { userId },
    select: { gachaId: true, gacha: { select: { ipName: true } } },
  });
  if (likes.length === 0) return [];

  const likedIds = likes.map((l) => l.gachaId);
  const ipNames = [...new Set(likes.map((l) => l.gacha.ipName))];

  // IP別に並列取得（ハート済みを除く・ハート数降順）
  const results = await Promise.all(
    ipNames.map((ipName) =>
      prisma.gacha.findMany({
        where: { isOnSale: true, ipName, id: { notIn: likedIds } },
        orderBy: { gachaLikes: { _count: 'desc' } },
        take: perIp,
        select: {
          id: true, seriesName: true, ipName: true,
          imageUrl: true, gradientFrom: true, gradientTo: true,
          status: true,
          _count: { select: { gachaLikes: true } },
        },
      })
    )
  );

  return ipNames
    .map((ipName, i) => ({
      ipName,
      gachas: results[i].map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes })),
    }))
    .filter((g) => g.gachas.length > 0);
}

export async function getGachasByIpNamesForSignup(ipNames: string[], perIp = 20) {
  const results = await Promise.all(
    ipNames.map((ipName) =>
      prisma.gacha.findMany({
        where: { isOnSale: true, ipName },
        orderBy: { machines: { _count: 'desc' } },
        take: perIp,
        select: {
          id: true, seriesName: true, ipName: true,
          gradientFrom: true, gradientTo: true, imageUrl: true,
        },
      })
    )
  );
  // IP順を維持しつつフラット化（重複除去）
  const seen = new Set<string>();
  return results.flat().filter((g) => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
}

export async function getGachasByIpName(ipName: string, limit = 100) {
  const rows = await prisma.gacha.findMany({
    where: { isOnSale: true, ipName },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take: limit,
    select: {
      id: true, seriesName: true, ipName: true,
      imageUrl: true, gradientFrom: true, gradientTo: true,
      status: true, releaseDate: true,
      _count: { select: { gachaLikes: true } },
    },
  });
  return rows.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }));
}

// ─── PostReply ────────────────────────────────────────────────────────────────

/** 投稿の直接返信一覧（children は別途取得） */
export async function getRepliesByPostId(postId: string) {
  return prisma.postReply.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likes: true, children: true } },
      children: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { likes: true, children: true } },
        },
      },
    },
  });
}

/** 返信を作成 */
export const createPostReply = (postId: string, userId: string, text: string, parentId?: string) =>
  prisma.postReply.create({
    data: { postId, userId, text, ...(parentId ? { parentId } : {}) },
  });

/** 返信いいねをトグル */
export async function togglePostReplyLike(userId: string, replyId: string) {
  const existing = await prisma.postReplyLike.findUnique({
    where: { userId_replyId: { userId, replyId } },
  });
  if (existing) {
    await prisma.postReplyLike.delete({ where: { userId_replyId: { userId, replyId } } });
    return { liked: false };
  } else {
    await prisma.postReplyLike.create({ data: { userId, replyId } });
    return { liked: true };
  }
}

/** ユーザーがいいねした返信IDセット */
export async function getPostReplyLikedIds(userId: string, replyIds: string[]) {
  const rows = await prisma.postReplyLike.findMany({
    where: { userId, replyId: { in: replyIds } },
    select: { replyId: true },
  });
  return new Set(rows.map(r => r.replyId));
}

// ─── Machine ──────────────────────────────────────────────────────────────────

export const upsertMachine = (spotId: string, gachaId: string) =>
  prisma.machine.upsert({
    where:  { spotId_gachaId: { spotId, gachaId } },
    update: { updatedAt: new Date() },
    create: { spotId, gachaId },
  });

// ─── Notification ─────────────────────────────────────────────────────────────

export const getNotificationsByUserId = (userId: string, take = 50) =>
  prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });

export const getUnreadNotificationCount = (userId: string) =>
  prisma.notification.count({
    where: { userId, read: false },
  });

export const markNotificationsAsRead = (userId: string) =>
  prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

export const getUserById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: { name: true } });

export const findPublicPost = (id: string) =>
  prisma.post.findFirst({ where: { id, isPublic: true }, select: { userId: true, spotId: true } });

export const findPublicStockPost = (id: string) =>
  prisma.stockPost.findFirst({ where: { id, isPublic: true }, select: { userId: true, spotId: true } });

export const findPublicSpotReview = (id: string) =>
  prisma.spotReview.findFirst({ where: { id, isPublic: true }, select: { userId: true, spotId: true } });

export const getGachaLikesForFanout = (
  gachaId: string,
  excludeUserId: string,
  cursor?: string,
  take = 500,
) =>
  prisma.gachaLike.findMany({
    where: { gachaId, NOT: { userId: excludeUserId } },
    select: { id: true, userId: true },
    orderBy: { id: 'asc' },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

export const createNotification = (data: Prisma.NotificationUncheckedCreateInput) =>
  prisma.notification.create({ data });

export const createNotificationMany = (data: Prisma.NotificationCreateManyInput[]) =>
  prisma.notification.createMany({ data });

export const findLikeNotification = (where: Prisma.NotificationWhereInput) =>
  prisma.notification.findFirst({ where, select: { id: true } });
