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

/** 指定ユーザーのうち「お気に入り在庫通知」をOFFにしているユーザーID（未作成はON扱いで対象外） */
export const getFavoriteStockDisabledUserIds = async (userIds: string[]): Promise<string[]> => {
  const rows = await prisma.userProfile.findMany({
    where: { userId: { in: userIds }, notifyFavoriteStock: false },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
};

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

/** 店舗スクレイパー: 今回店舗で見つかったガチャを在庫あり(発売中)に更新する（スイープの逆） */
export const markGachasInStore = (ids: string[]) =>
  ids.length === 0
    ? Promise.resolve({ count: 0 })
    : prisma.gacha.updateMany({
        where: { id: { in: ids } },
        data: { isOnSale: true, status: 'on_sale' },
      });

/** 店舗スクレイパーのスイープ処理: 今回見つからなかったガチャを終了扱いにする */
export const markGachasEnded = (ids: string[]) =>
  ids.length === 0
    ? Promise.resolve({ count: 0 })
    : prisma.gacha.updateMany({
        where: { id: { in: ids } },
        data:  { isOnSale: false, status: 'ended' },
      });

/** スイープ用: 現在 isOnSale:true の全ガチャIDを返す */
export const getOnSaleGachaIds = () =>
  prisma.gacha.findMany({
    where:  { isOnSale: true },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

export const getGachaById = (id: string) =>
  prisma.gacha.findUnique({
    where: { id },
    select: {
      id: true, seriesName: true, ipName: true, category: true,
      status: true, price: true, gradientFrom: true, gradientTo: true,
      lineup: true, imageUrl: true,
      postCount: true, isReissue: true,
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

export const getNotificationsByUserId = async (userId: string, take = 50) => {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });

  // 参照先（投稿/在庫報告/口コミ）が削除済みの通知は一覧に出さない
  const postIds   = [...new Set(rows.map(r => r.postId).filter((v): v is string => !!v))];
  const stockIds  = [...new Set(rows.map(r => r.stockPostId).filter((v): v is string => !!v))];
  const reviewIds = [...new Set(rows.map(r => r.spotReviewId).filter((v): v is string => !!v))];

  const [posts, stocks, reviews] = await Promise.all([
    postIds.length   ? prisma.post.findMany({      where: { id: { in: postIds } },   select: { id: true } }) : [],
    stockIds.length  ? prisma.stockPost.findMany({ where: { id: { in: stockIds } },  select: { id: true } }) : [],
    reviewIds.length ? prisma.spotReview.findMany({where: { id: { in: reviewIds } }, select: { id: true } }) : [],
  ]);
  const postSet   = new Set(posts.map(p => p.id));
  const stockSet  = new Set(stocks.map(s => s.id));
  const reviewSet = new Set(reviews.map(r => r.id));

  return rows.filter(n => {
    if (n.postId       && !postSet.has(n.postId))       return false;
    if (n.stockPostId  && !stockSet.has(n.stockPostId)) return false;
    if (n.spotReviewId && !reviewSet.has(n.spotReviewId)) return false;
    return true;
  });
};

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

/** 既読かつ cutoff より前に作成された通知を削除（自動クリーンアップ用） */
export const deleteReadNotificationsBefore = (cutoff: Date) =>
  prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: cutoff } } });

// ─── Post（通常投稿） ───────────────────────────────────────────────────────────

const FEED_USER_SELECT  = { id: true, name: true, image: true } as const;
const FEED_SPOT_SELECT  = { id: true, name: true, address: true, lat: true, lng: true } as const;
const FEED_GACHA_SELECT = { id: true, ipName: true, seriesName: true, gradientFrom: true, gradientTo: true, imageUrl: true } as const;
const REPLY_USER_INCLUDE = { user: { select: FEED_USER_SELECT } } as const;

export const createPost = (data: Prisma.PostUncheckedCreateInput) =>
  prisma.post.create({ data });

export const getPostOwnerId = (id: string) =>
  prisma.post.findUnique({ where: { id }, select: { userId: true } });

export const deletePost = (id: string) =>
  // 投稿本体と、その投稿を参照する通知（いいね/返信）を同時に削除
  prisma.$transaction([
    prisma.notification.deleteMany({ where: { postId: id } }),
    prisma.post.delete({ where: { id } }),
  ]);

export const countPostsByGacha = (gachaId: string) =>
  prisma.post.count({ where: { gachaId } });

export const countPostsByGachaSince = (gachaId: string, since: Date) =>
  prisma.post.count({ where: { gachaId, createdAt: { gte: since } } });

// ─── Like（投稿いいね） ─────────────────────────────────────────────────────────

/** 投稿いいねをトグルし、最新いいね数を返す */
export async function togglePostLike(userId: string, postId: string) {
  const existing = await prisma.like.findUnique({ where: { userId_postId: { userId, postId } } });
  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
  } else {
    await prisma.like.create({ data: { userId, postId } });
  }
  const likeCount = await prisma.like.count({ where: { postId } });
  return { liked: !existing, likeCount };
}

// ─── PostReply（ルート用: user 付き） ───────────────────────────────────────────

export const listPostReplies = (postId: string) =>
  prisma.postReply.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: REPLY_USER_INCLUDE,
  });

export const createPostReplyWithUser = (postId: string, userId: string, text: string) =>
  prisma.postReply.create({
    data: { postId, userId, text, parentId: null },
    include: REPLY_USER_INCLUDE,
  });

export const getPostReplyById = (id: string) =>
  prisma.postReply.findUnique({ where: { id } });

export const deletePostReply = async (id: string) => {
  const reply = await prisma.postReply.findUnique({ where: { id }, select: { userId: true, postId: true } });
  await prisma.postReply.delete({ where: { id } });
  // この返信に対応する「返信がきました」通知を1件削除（返信IDは通知に保持していないため、投稿主×返信者で特定）
  if (reply) {
    const notif = await prisma.notification.findFirst({
      where: { type: 'reply', actorId: reply.userId, postId: reply.postId },
      orderBy: { createdAt: 'desc' }, select: { id: true },
    });
    if (notif) await prisma.notification.delete({ where: { id: notif.id } });
  }
};

// ─── Feed（ホーム/店舗フィード） ────────────────────────────────────────────────

export const getUserGachaLikesWithIp = (userId: string) =>
  prisma.gachaLike.findMany({
    where: { userId },
    select: { gachaId: true, gacha: { select: { ipName: true } } },
  });

export const getFeedStockPosts = (filter: { spotId?: string | null; gachaIds?: string[] | null }) =>
  prisma.stockPost.findMany({
    where: {
      isPublic: true,
      gacha: { isOnSale: true },
      ...(filter.spotId ? { spotId: filter.spotId } : {}),
      ...(filter.gachaIds && filter.gachaIds.length > 0 ? { gachaId: { in: filter.gachaIds } } : {}),
    },
    include: {
      user:   { select: FEED_USER_SELECT },
      spot:   { select: FEED_SPOT_SELECT },
      gacha:  { select: FEED_GACHA_SELECT },
      _count: { select: { likes: true, replies: true } },
    },
  });

export const getFeedPosts = (filter: { spotId?: string | null; gachaIds?: string[] | null }) =>
  prisma.post.findMany({
    where: {
      isPublic: true,
      gacha: { isOnSale: true },
      ...(filter.spotId ? { spotId: filter.spotId } : {}),
      ...(filter.gachaIds && filter.gachaIds.length > 0 ? { gachaId: { in: filter.gachaIds } } : {}),
    },
    include: {
      user:   { select: FEED_USER_SELECT },
      spot:   { select: FEED_SPOT_SELECT },
      gacha:  { select: FEED_GACHA_SELECT },
      _count: { select: { likes: true, replies: true } },
    },
  });

export const getStockPostLikedIds = (userId: string, stockPostIds: string[]) =>
  prisma.stockPostLike.findMany({ where: { userId, stockPostId: { in: stockPostIds } }, select: { stockPostId: true } });

export const getPostLikedIds = (userId: string, postIds: string[]) =>
  prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } });

// ─── StockPost（在庫報告） ──────────────────────────────────────────────────────

/** Machine を upsert し stockStatus を最新化 */
export const upsertMachineWithStock = (spotId: string, gachaId: string, stockStatus: string) =>
  prisma.machine.upsert({
    where:  { spotId_gachaId: { spotId, gachaId } },
    create: { spotId, gachaId, stockStatus },
    update: { stockStatus },
  });

export const createStockPost = (data: Prisma.StockPostUncheckedCreateInput) =>
  prisma.stockPost.create({ data });

export const getStockPostOwnerId = (id: string) =>
  prisma.stockPost.findUnique({ where: { id }, select: { userId: true } });

export const deleteStockPost = (id: string) =>
  // 在庫報告本体と、それを参照する通知（お気に入り在庫/いいね/返信）を同時に削除
  prisma.$transaction([
    prisma.notification.deleteMany({ where: { stockPostId: id } }),
    prisma.stockPost.delete({ where: { id } }),
  ]);

/** 在庫報告いいねをトグル */
export async function toggleStockPostLike(userId: string, stockPostId: string) {
  const existing = await prisma.stockPostLike.findUnique({ where: { userId_stockPostId: { userId, stockPostId } } });
  if (existing) {
    await prisma.stockPostLike.delete({ where: { userId_stockPostId: { userId, stockPostId } } });
    return { liked: false };
  } else {
    await prisma.stockPostLike.create({ data: { userId, stockPostId } });
    return { liked: true };
  }
}

export const listStockPostReplies = (stockPostId: string) =>
  prisma.stockPostReply.findMany({
    where: { stockPostId },
    orderBy: { createdAt: 'asc' },
    include: REPLY_USER_INCLUDE,
  });

export const createStockPostReplyWithUser = (stockPostId: string, userId: string, text: string) =>
  prisma.stockPostReply.create({
    data: { stockPostId, userId, text },
    include: REPLY_USER_INCLUDE,
  });

export const getStockPostReplyById = (id: string) =>
  prisma.stockPostReply.findUnique({ where: { id } });

export const deleteStockPostReply = async (id: string) => {
  const reply = await prisma.stockPostReply.findUnique({ where: { id }, select: { userId: true, stockPostId: true } });
  await prisma.stockPostReply.delete({ where: { id } });
  if (reply) {
    const notif = await prisma.notification.findFirst({
      where: { type: 'reply', actorId: reply.userId, stockPostId: reply.stockPostId },
      orderBy: { createdAt: 'desc' }, select: { id: true },
    });
    if (notif) await prisma.notification.delete({ where: { id: notif.id } });
  }
};

// ─── SpotReview（店舗レビュー） ─────────────────────────────────────────────────

export const countSpotReviews = (spotId: string) =>
  prisma.spotReview.count({ where: { spotId, isPublic: true } });

export const listSpotReviews = (spotId: string, skip: number, take: number) =>
  prisma.spotReview.findMany({
    where: { spotId, isPublic: true },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      user: { select: FEED_USER_SELECT },
      replies: { include: REPLY_USER_INCLUDE, orderBy: { createdAt: 'asc' } },
      _count: { select: { likes: true } },
      likes: { select: { userId: true } },
    },
  });

export const createSpotReview = (spotId: string, userId: string, text: string) =>
  prisma.spotReview.create({
    data: { spotId, userId, text },
    include: {
      user: { select: FEED_USER_SELECT },
      replies: { include: REPLY_USER_INCLUDE },
      _count: { select: { likes: true } },
    },
  });

export const getSpotReviewById = (id: string) =>
  prisma.spotReview.findUnique({ where: { id } });

export const updateSpotReview = (id: string, text: string) =>
  prisma.spotReview.update({
    where: { id },
    data: { text },
    include: { user: { select: FEED_USER_SELECT }, _count: { select: { likes: true } } },
  });

export const deleteSpotReview = (id: string) =>
  // 口コミ本体と、それを参照する通知（いいね/返信）を同時に削除
  prisma.$transaction([
    prisma.notification.deleteMany({ where: { spotReviewId: id } }),
    prisma.spotReview.delete({ where: { id } }),
  ]);

/** レビューいいねをトグルし、最新いいね数を返す */
export async function toggleSpotReviewLike(userId: string, reviewId: string) {
  const existing = await prisma.spotReviewLike.findUnique({ where: { userId_reviewId: { userId, reviewId } } });
  if (existing) {
    await prisma.spotReviewLike.delete({ where: { userId_reviewId: { userId, reviewId } } });
  } else {
    await prisma.spotReviewLike.create({ data: { userId, reviewId } });
  }
  const count = await prisma.spotReviewLike.count({ where: { reviewId } });
  return { liked: !existing, count };
}

// ─── マイページ / アカウント ────────────────────────────────────────────────────

/** 退会（関連データは onDelete: Cascade で連鎖削除） */
export const deleteUser = (id: string) =>
  prisma.user.delete({ where: { id } });

/** ユーザー名を更新 */
export const updateUserName = (id: string, name: string) =>
  prisma.user.update({ where: { id }, data: { name } });

/** ユーザーの表示画像（User.image）を更新（プロフィールアイコンと同期・削除時はnull） */
export const updateUserImage = (id: string, image: string | null) =>
  prisma.user.update({ where: { id }, data: { image } });

export type ProfileUpsertData = {
  handle?: string;
  bio?: string;
  avatarUrl?: string | null;
  favoriteIps?: string[];
  notifyFavoriteStock?: boolean;
  notifyReaction?: boolean;
  mapRadiusM?: number;
};

/** プロフィール設定を upsert（渡されたフィールドのみ更新） */
export const upsertUserProfile = (userId: string, data: ProfileUpsertData) =>
  prisma.userProfile.upsert({
    where:  { userId },
    update: data,
    create: { userId, ...data },
  });

const PROFILE_POST_INCLUDE = {
  user:  { select: { id: true, name: true, image: true } },
  spot:  { select: { id: true, name: true, address: true } },
  gacha: { select: { id: true, ipName: true, seriesName: true, gradientFrom: true, gradientTo: true, imageUrl: true, isOnSale: true } },
  _count: { select: { likes: true, replies: true } },
} as const;

/** 指定ユーザーの「引いた！」投稿一覧（カード表示用のfull形状・新しい順・最大50件） */
export const getUserPosts = (userId: string) =>
  prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: PROFILE_POST_INCLUDE,
  });

/** 指定ユーザーの在庫報告一覧（カード表示用のfull形状・新しい順・最大50件） */
export const getUserStockPosts = (userId: string) =>
  prisma.stockPost.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: PROFILE_POST_INCLUDE,
  });

/** 単体の投稿/在庫報告（カード表示用のfull形状。通知からの直接表示に使用） */
export const getPostById = (id: string) =>
  prisma.post.findUnique({ where: { id }, include: PROFILE_POST_INCLUDE });

export const getStockPostById = (id: string) =>
  prisma.stockPost.findUnique({ where: { id }, include: PROFILE_POST_INCLUDE });

/** 指定ユーザーのお気に入りガチャ一覧（公開・カード表示用のfull形状） */
export const getUserFavorites = (userId: string) =>
  prisma.gachaLike.findMany({
    where: { userId },
    include: {
      gacha: {
        select: {
          id: true, seriesName: true, ipName: true, imageUrl: true,
          gradientFrom: true, gradientTo: true, status: true, releaseDate: true, isOnSale: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

export const countUserPosts = (userId: string): Promise<number> =>
  prisma.post.count({ where: { userId } });

export const countUserPostsByResult = (userId: string, result: string): Promise<number> =>
  prisma.post.count({ where: { userId, result } });

export const countLikesOnUserPosts = (userId: string): Promise<number> =>
  prisma.like.count({ where: { post: { userId } } });

export const countLikesOnUserStockPosts = (userId: string): Promise<number> =>
  prisma.stockPostLike.count({ where: { stockPost: { userId } } });

/** 公開プロフィール＋統計（他ユーザー閲覧用。email/設定などの非公開情報は含めない） */
export async function getPublicUserSummary(userId: string) {
  const [user, profile, postCount, kamibikiCount, postLikes, stockPostLikes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } }),
    findProfileByUserId(userId),
    countUserPosts(userId),
    countUserPostsByResult(userId, '神引き'),
    countLikesOnUserPosts(userId),
    countLikesOnUserStockPosts(userId),
  ]);
  if (!user) return null;
  return {
    id:          userId,
    name:        user.name,
    handle:      profile?.handle ?? null,
    avatarUrl:   profile?.avatarUrl ?? user.image ?? null,
    bio:         profile?.bio ?? null,
    favoriteIps: profile?.favoriteIps ?? [],
    stats: {
      postCount,
      kamibikiCount,
      likeCount: postLikes + stockPostLikes,
    },
  };
}

export const createSpotReviewReplyWithUser = (reviewId: string, userId: string, text: string) =>
  prisma.spotReviewReply.create({
    data: { reviewId, userId, text },
    include: REPLY_USER_INCLUDE,
  });

export const getSpotReviewReplyById = (id: string) =>
  prisma.spotReviewReply.findUnique({ where: { id } });

export const deleteSpotReviewReply = async (id: string) => {
  const reply = await prisma.spotReviewReply.findUnique({ where: { id }, select: { userId: true, reviewId: true } });
  await prisma.spotReviewReply.delete({ where: { id } });
  if (reply) {
    const notif = await prisma.notification.findFirst({
      where: { type: 'reply', actorId: reply.userId, spotReviewId: reply.reviewId },
      orderBy: { createdAt: 'desc' }, select: { id: true },
    });
    if (notif) await prisma.notification.delete({ where: { id: notif.id } });
  }
};

// ─── Spot 検索 ──────────────────────────────────────────────────────────────────

export const searchSpotsForSuggest = (name: string, gachaId?: string) =>
  prisma.spot.findMany({
    where: {
      OR: [
        { name:    { contains: name, mode: 'insensitive' } },
        { address: { contains: name, mode: 'insensitive' } },
      ],
      ...(gachaId ? { machines: { some: { gachaId } } } : {}),
    },
    select: { id: true, name: true, address: true, lat: true, lng: true },
    take: 100,
  });

export const searchSpotsByName = (name: string) =>
  prisma.spot.findMany({
    where: { name: { contains: name, mode: 'insensitive' } },
    include: { machines: { select: { gachaId: true, stockStatus: true } } },
  });

// ─── Gacha 検索 / お気に入り / IP ────────────────────────────────────────────────

export const getUserFavoriteGachas = (userId: string) =>
  prisma.gachaLike.findMany({
    where: { userId },
    include: {
      gacha: {
        select: {
          id: true, seriesName: true, ipName: true, imageUrl: true,
          gradientFrom: true, gradientTo: true, status: true, releaseDate: true, isOnSale: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

export const deleteGachaLike = (userId: string, gachaId: string) =>
  prisma.gachaLike.deleteMany({ where: { userId, gachaId } });

export const groupGachaByIpAndCategory = () =>
  prisma.gacha.groupBy({
    by: ['ipName', 'ipCategory'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

const seriesTermsWhere = (terms: string[]): Prisma.GachaWhereInput =>
  terms.length === 1
    ? { seriesName: { contains: terms[0], mode: 'insensitive' } }
    : { OR: terms.map(t => ({ seriesName: { contains: t, mode: 'insensitive' as const } })) };

const ipTermsWhere = (terms: string[]): Prisma.GachaWhereInput =>
  terms.length === 1
    ? { ipName: { contains: terms[0], mode: 'insensitive' } }
    : { OR: terms.map(t => ({ ipName: { contains: t, mode: 'insensitive' as const } })) };

export const findOnSaleSeriesByExactIp = (ipName: string) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ipName: { equals: ipName, mode: 'insensitive' } },
    select: { seriesName: true, imageUrl: true },
    distinct: ['seriesName'],
    orderBy: { seriesName: 'asc' },
  });

export const suggestGachaSeries = (terms: string[]) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ...seriesTermsWhere(terms) },
    select: { seriesName: true, imageUrl: true },
    distinct: ['seriesName'],
    orderBy: { seriesName: 'asc' },
  });

export const suggestGachaIps = (terms: string[]) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ...ipTermsWhere(terms) },
    select: { ipName: true },
    distinct: ['ipName'],
    orderBy: { ipName: 'asc' },
  });

export const findOnSaleExactIp = (ipName: string) =>
  prisma.gacha.findFirst({
    where: { isOnSale: true, ipName: { equals: ipName, mode: 'insensitive' } },
    select: { ipName: true },
  });

export const findGachaIdsByExactIp = (ipName: string) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ipName: { equals: ipName, mode: 'insensitive' } },
    select: { id: true, ipName: true },
  });

export const findGachaIdsBySeriesTerms = (terms: string[]) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ...seriesTermsWhere(terms) },
    select: { id: true, seriesName: true },
  });

export const findGachaIdsByIpTerms = (terms: string[]) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ...ipTermsWhere(terms) },
    select: { id: true, ipName: true },
  });

// ─── Community / User 検索 ──────────────────────────────────────────────────────

export const getGachasWithLikeCount = () =>
  prisma.gacha.findMany({
    select: {
      id: true, seriesName: true, ipName: true, imageUrl: true, gradientFrom: true, gradientTo: true,
      _count: { select: { gachaLikes: true } },
    },
    orderBy: { gachaLikes: { _count: 'desc' } },
  });

export const getUserLikedIpNames = async (userId: string): Promise<string[]> => {
  const rows = await prisma.gachaLike.findMany({ where: { userId }, select: { gacha: { select: { ipName: true } } } });
  return [...new Set(rows.map(r => r.gacha.ipName))];
};

export const getGachaIdsByIpNames = async (ipNames: string[]): Promise<string[]> => {
  if (ipNames.length === 0) return [];
  const rows = await prisma.gacha.findMany({ where: { ipName: { in: ipNames } }, select: { id: true } });
  return rows.map(g => g.id);
};

export const getUserIdsWhoLikedGachas = async (gachaIds: string[], excludeUserId: string): Promise<string[]> => {
  if (gachaIds.length === 0) return [];
  const rows = await prisma.gachaLike.findMany({
    where: { gachaId: { in: gachaIds }, userId: { not: excludeUserId } },
    select: { userId: true },
    distinct: ['userId'],
  });
  return rows.map(r => r.userId);
};

const USER_PROFILE_SELECT = {
  id: true, name: true, image: true,
  profile: { select: { handle: true, avatarUrl: true, bio: true } },
} as const;

export const getUsersByIds = (ids: string[], take: number) =>
  prisma.user.findMany({ where: { id: { in: ids } }, select: USER_PROFILE_SELECT, take });

export const searchUsers = (q: string, excludeUserId?: string) =>
  prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { profile: { handle: { contains: q, mode: 'insensitive' } } },
      ],
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: USER_PROFILE_SELECT,
    take: 10,
  });

// ─── Coming Soon（近日発売の補完取得） ──────────────────────────────────────────

const COMING_SOON_SELECT = {
  id: true, seriesName: true, ipName: true,
  imageUrl: true, gradientFrom: true, gradientTo: true,
  status: true, releaseDate: true,
  _count: { select: { gachaLikes: true } },
} as const;

/** 追加の where を受け取り、いいね数降順で take 件のガチャを返す（発売中のみ） */
export const findComingSoonGachas = (where: Prisma.GachaWhereInput, take: number) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ...where },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take,
    select: COMING_SOON_SELECT,
  });

// ─── ホーム: カテゴリ別（発売中×いいね順） ────────────────────────────────────

/** 発売中のうち ipName が指定リストに含まれるものを、いいね数降順で take 件。 */
export const getOnSaleGachasByIpNames = (ipNames: string[], take: number) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ipName: { in: ipNames } },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take,
    select: COMING_SOON_SELECT,
  });

/** 発売中のうち ipName が指定リストに含まれないものを、いいね数降順で take 件（食べ物・動物・その他用）。 */
export const getOnSaleGachasNotInIpNames = (ipNames: string[], take: number) =>
  prisma.gacha.findMany({
    where: { isOnSale: true, ipName: { notIn: ipNames } },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take,
    select: COMING_SOON_SELECT,
  });
