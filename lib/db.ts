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

/** dev ホットリロードで古い PrismaClient が残ったとき delegate 欠落を検知する */
function hasSignupPendingDelegate(client: PrismaClient): boolean {
  return 'signupPending' in (client as object);
}

function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  // スキーマ追加後に dev サーバーを再起動せず古い Client が残ると delegate が undefined になる
  if (existing && hasSignupPendingDelegate(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }
  globalForPrisma.prisma = createPrisma();
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
  ipNameId: string | null; // #19: スクレイプ時に解決した IpName の id（除外 ipName は null）
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
}

// #19: ip リレーション付きの行を、従来の { ipName: string } 形状へ平坦化する（外部レスポンス契約を維持）。
type WithIp = { ip: { name: string } | null };
const flatIp = <T extends WithIp>(g: T): Omit<T, 'ip'> & { ipName: string } => {
  const { ip, ...rest } = g;
  return { ...rest, ipName: ip?.name ?? '' };
};
// gacha をネストに持つ行の gacha を平坦化する。
const flatGacha = <T extends { gacha: WithIp }>(row: T): Omit<T, 'gacha'> & { gacha: Omit<T['gacha'], 'ip'> & { ipName: string } } => {
  const { gacha, ...rest } = row;
  return { ...rest, gacha: flatIp(gacha) };
};
// select 断片: 旧 ipName 列の代わりに ip リレーション名を引く。
const IP_NAME_SELECT = { ip: { select: { name: true } } } as const;

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
  const rows = await prisma.gacha.findMany({
    where: { status: 'on_sale' },
    select: {
      id: true, seriesName: true, imageUrl: true,
      _count: { select: { gachaLikes: true } },
      ...IP_NAME_SELECT,
    },
    orderBy: [{ ip: { name: 'asc' } }, { seriesName: 'asc' }],
  });
  const items = rows.map(row => ({
    ...flatIp({
      id: row.id,
      seriesName: row.seriesName,
      imageUrl: row.imageUrl,
      ip: row.ip,
    }),
    likeCount: row._count.gachaLikes,
  }));
  // 総いいね数が多い順に IP を並べる（未 link のガチャは IP 一覧に出さない）
  const likeMap = new Map<string, number>();
  for (const row of rows) {
    const name = row.ip?.name;
    if (!name) continue;
    likeMap.set(name, (likeMap.get(name) ?? 0) + row._count.gachaLikes);
  }
  const ipNames = [...likeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ip]) => ip);
  return { ipNames, items };
}

/** 発売中ガチャのいいね（お気に入り）総数が多い順に IP 名を返す（投稿ページの人気IP用） */
export async function getPopularIpsByLikes(limit = 12): Promise<string[]> {
  const rows = await prisma.gacha.findMany({
    where: { status: 'on_sale' },
    select: { _count: { select: { gachaLikes: true } }, ...IP_NAME_SELECT },
  });
  const likeMap = new Map<string, number>();
  for (const g of rows) {
    const name = g.ip?.name;
    if (!name) continue;
    likeMap.set(name, (likeMap.get(name) ?? 0) + g._count.gachaLikes);
  }
  return [...likeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ip]) => ip)
    .slice(0, limit);
}

export type SignupIpOption = {
  ipName: string;
  imageUrl: string | null;
};

/** 各 IP の代表 imageUrl（配下で最もいいね数が多い on_sale ガチャ） */
async function signupIpImagesByIpNameIds(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const gachaRows = await prisma.gacha.findMany({
    where: { status: 'on_sale', ipNameId: { in: ids } },
    select: {
      ipNameId: true,
      imageUrl: true,
      _count: { select: { gachaLikes: true } },
    },
    orderBy: { gachaLikes: { _count: 'desc' } },
  });
  const imageByIpId = new Map<string, string | null>();
  for (const g of gachaRows) {
    if (!g.ipNameId || imageByIpId.has(g.ipNameId)) continue;
    imageByIpId.set(g.ipNameId, g.imageUrl);
  }
  return imageByIpId;
}

/** 総いいね数が多い順に IP を返す。各 IP の imageUrl は配下で最もいいね数が多いガチャのアイコン */
export async function getPopularIpsWithTopGachaImage(limit = 9): Promise<SignupIpOption[]> {
  const capped = Math.min(20, Math.max(1, limit));
  const rows = await prisma.$queryRaw<{ ipNameId: string; ipName: string }[]>`
    SELECT ipn.id AS "ipNameId", ipn.name AS "ipName"
    FROM "Gacha" g
    JOIN "IpName" ipn ON ipn.id = g."ipNameId"
    LEFT JOIN "GachaLike" gl ON gl."gachaId" = g.id
    WHERE g.status = 'on_sale' AND g."ipNameId" IS NOT NULL
    GROUP BY ipn.id, ipn.name
    ORDER BY COUNT(gl.id) DESC, ipn.name ASC
    LIMIT ${capped}
  `;
  if (rows.length === 0) return [];

  const imageByIpId = await signupIpImagesByIpNameIds(rows.map((r) => r.ipNameId));
  return rows.map((r) => ({
    ipName: r.ipName,
    imageUrl: imageByIpId.get(r.ipNameId) ?? null,
  }));
}

/** 新規登録 IP 検索: 名前部分一致（複数語 OR）→ 販売中ガチャ数が多い順（最大 limit 件）+ 代表画像 */
export async function searchSignupIpsByName(terms: string[], limit = 9): Promise<SignupIpOption[]> {
  const normalized = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
  if (normalized.length === 0) return [];

  const capped = Math.min(20, Math.max(1, limit));
  const grouped = await prisma.gacha.groupBy({
    by: ['ipNameId'],
    where: {
      status: 'on_sale',
      ipNameId: { not: null },
      ...ipTermsWhere(normalized),
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: capped,
  });

  const ids = grouped
    .map((g) => g.ipNameId)
    .filter((id): id is string => id !== null);
  if (ids.length === 0) return [];

  const [names, imageByIpId] = await Promise.all([
    prisma.ipName.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    }),
    signupIpImagesByIpNameIds(ids),
  ]);

  const nameById = new Map(names.map((n) => [n.id, n.name]));

  return ids
    .map((id) => ({
      ipName: nameById.get(id) ?? '',
      imageUrl: imageByIpId.get(id) ?? null,
    }))
    .filter((row) => row.ipName);
}

/** 指定 IP ごとに、配下で最もいいね数が多いガチャのアイコンを返す（検索結果用） */
export async function getTopGachaImageByIpNames(ipNames: string[]): Promise<SignupIpOption[]> {
  const unique = [...new Set(ipNames.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const rows = await prisma.gacha.findMany({
    where: {
      status: 'on_sale',
      OR: unique.map((name) => ({ ip: { name: { equals: name, mode: 'insensitive' as const } } })),
    },
    select: {
      imageUrl: true,
      _count: { select: { gachaLikes: true } },
      ...IP_NAME_SELECT,
    },
    orderBy: { gachaLikes: { _count: 'desc' } },
  });

  const imageByCanonical = new Map<string, string | null>();
  const canonicalByLower = new Map<string, string>();
  for (const g of rows) {
    const name = g.ip?.name;
    if (!name) continue;
    canonicalByLower.set(name.toLowerCase(), name);
    if (!imageByCanonical.has(name)) imageByCanonical.set(name, g.imageUrl);
  }

  const seen = new Set<string>();
  const out: SignupIpOption[] = [];
  for (const query of unique) {
    const canonical = canonicalByLower.get(query.toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push({ ipName: canonical, imageUrl: imageByCanonical.get(canonical) ?? null });
  }
  return out;
}

export const findGachaByWpPostId = (wpPostId: number) =>
  prisma.gacha.findUnique({ where: { wpPostId } });

export const upsertGachaFromScraper = (data: GachaUpsertData) =>
  prisma.gacha.upsert({
    where:  { wpPostId: data.wpPostId },
    update: {
      seriesName:  data.seriesName,
      ipNameId:    data.ipNameId,
      genre:       data.genre,
      maker:       data.maker,
      imageUrl:    data.imageUrl,
      releaseDate: data.releaseDate,
      sourceUrl:   data.sourceUrl,
      // status は on_sale→coming_soon に戻さない（スケジュールは on_sale をスキップするので上書きされない）
      status:      data.status,
      price:       data.price,
      lineup:      data.lineup,
    },
    create: {
      seriesName:   data.seriesName,
      ipNameId:     data.ipNameId,
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
    },
  });

/** 店舗スクレイパー: 今回店舗で見つかったガチャを在庫あり(発売中)に更新する（スイープの逆） */
export const markGachasInStore = (ids: string[]) =>
  ids.length === 0
    ? Promise.resolve({ count: 0 })
    : prisma.gacha.updateMany({
        where: { id: { in: ids } },
        data: { status: 'on_sale' },
      });

/** 店舗スクレイパーのスイープ処理: 今回見つからなかったガチャを終了扱いにする */
export const markGachasEnded = (ids: string[]) =>
  ids.length === 0
    ? Promise.resolve({ count: 0 })
    : prisma.gacha.updateMany({
        where: { id: { in: ids } },
        data:  { status: 'ended' },
      });

/** スイープ用: 現在 status='on_sale' の全ガチャIDを返す */
export const getOnSaleGachaIds = () =>
  prisma.gacha.findMany({
    where:  { status: 'on_sale' },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

export async function getGachaById(id: string) {
  const row = await prisma.gacha.findUnique({
    where: { id },
    select: {
      id: true, seriesName: true, category: true, ...IP_NAME_SELECT,
      status: true, price: true, gradientFrom: true, gradientTo: true,
      lineup: true, imageUrl: true,
      postCount: true, isReissue: true,
      genre: true, releaseDate: true, maker: true, sourceUrl: true,
    },
  });
  return row ? flatIp(row) : null;
}

export async function getPopularGachas(limit = 20, excludeIds: string[] = []) {
  const rows = await prisma.gacha.findMany({
    where: { status: 'on_sale', ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}) },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take: limit,
    select: {
      id: true, seriesName: true, ...IP_NAME_SELECT,
      imageUrl: true, gradientFrom: true, gradientTo: true,
      status: true, price: true,
      _count: { select: { gachaLikes: true } },
    },
  });
  return rows.map(({ _count, ...g }) => ({ ...flatIp(g), likeCount: _count.gachaLikes }));
}

// ホームのピックアップ枠（admin が手動設定）の選択中ガチャを sortOrder 順に返す。section='weekly'|'reissue'。
export async function getHomePickupGachas(section: string) {
  const rows = await prisma.homePickup.findMany({
    where: { section },
    orderBy: { sortOrder: 'asc' },
    select: {
      gacha: {
        select: {
          id: true, seriesName: true, ...IP_NAME_SELECT,
          imageUrl: true, gradientFrom: true, gradientTo: true,
          status: true, releaseDate: true,
          _count: { select: { gachaLikes: true } },
        },
      },
    },
  });
  return rows.map(({ gacha: { _count, ...g } }) => ({ ...flatIp(g), likeCount: _count.gachaLikes }));
}

export async function getRecommendedByLikedGachas(userId: string, perIp = 9, maxIps = 5) {
  // ユーザーのハート済みガチャとその IpName を取得
  const likes = await prisma.gachaLike.findMany({
    where: { userId },
    select: { gachaId: true, gacha: { select: { ...IP_NAME_SELECT } } },
  });
  if (likes.length === 0) return [];

  const likedIds = likes.map((l) => l.gachaId);

  // IP別に「ユーザーがいいねしたガチャ数」を集計し、多い順に並べて上位 maxIps 件へ絞る
  const likeCountByIp = new Map<string, number>();
  for (const l of likes) {
    const name = l.gacha.ip?.name;
    if (name) likeCountByIp.set(name, (likeCountByIp.get(name) ?? 0) + 1);
  }
  const ipNames = [...likeCountByIp.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, maxIps)
    .map(([name]) => name);

  // IP別に並列取得（ハート済みを除く・ハート数降順）
  const results = await Promise.all(
    ipNames.map((ipName) =>
      prisma.gacha.findMany({
        where: { status: 'on_sale', ip: { name: ipName }, id: { notIn: likedIds } },
        orderBy: { gachaLikes: { _count: 'desc' } },
        take: perIp,
        select: {
          id: true, seriesName: true, ...IP_NAME_SELECT,
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
      gachas: results[i].map(({ _count, ...g }) => ({ ...flatIp(g), likeCount: _count.gachaLikes })),
    }))
    .filter((g) => g.gachas.length > 0);
}

export async function getGachasByIpNamesForSignup(ipNames: string[], perIp = 20) {
  const results = await Promise.all(
    ipNames.map((ipName) =>
      prisma.gacha.findMany({
        where: { status: 'on_sale', ip: { name: ipName } },
        orderBy: { machines: { _count: 'desc' } },
        take: perIp,
        select: {
          id: true, seriesName: true, ...IP_NAME_SELECT,
          gradientFrom: true, gradientTo: true, imageUrl: true,
        },
      })
    )
  );
  // IP順を維持しつつフラット化（重複除去）
  const seen = new Set<string>();
  return results.flat().map(flatIp).filter((g) => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
}

export async function getGachasByIpName(ipName: string, limit = 100) {
  const rows = await prisma.gacha.findMany({
    where: { status: 'on_sale', ip: { name: ipName } },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take: limit,
    select: {
      id: true, seriesName: true, ...IP_NAME_SELECT,
      imageUrl: true, gradientFrom: true, gradientTo: true,
      status: true, releaseDate: true,
      _count: { select: { gachaLikes: true } },
    },
  });
  return rows.map(({ _count, ...g }) => ({ ...flatIp(g), likeCount: _count.gachaLikes }));
}

/** 新規登録: 各 IP ごとにいいね数が多い順で上位 N 件のガチャを返す */
export async function getTopGachasByIpNamesForSignup(ipNames: string[], perIp = 4) {
  const unique = [...new Set(ipNames.map((n) => n.trim()).filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (ipName) => ({
      ipName,
      gachas: await getGachasByIpName(ipName, perIp),
    })),
  );
  return results;
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

// 通知一覧の1件（表示用に整形済み）。actors[0] を左アバターに、
// like は同一対象へのいいねを集約して actors を下に並べる。
export interface NotificationActor { id: string; name: string; image: string | null }
export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  gachaId: string | null;
  spotId: string | null;
  postId: string | null;
  stockPostId: string | null;
  spotReviewId: string | null;
  read: boolean;
  createdAt: Date;
  actors: NotificationActor[]; // 表示用（上限あり）。like は集約後の重複なし
  actorCount: number;          // 集約後の実人数（+N 表示用）
  thumbnailUrl: string | null; // 右サムネ（投稿写真/ガチャ画像）
}

// 集約時に下へ並べるアバターの保持上限（表示制限）
const NOTIF_ACTOR_CAP = 8;

export const getNotificationsByUserId = async (userId: string, take = 50): Promise<NotificationView[]> => {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });

  const postIds   = [...new Set(rows.map(r => r.postId).filter((v): v is string => !!v))];
  const stockIds  = [...new Set(rows.map(r => r.stockPostId).filter((v): v is string => !!v))];
  const reviewIds = [...new Set(rows.map(r => r.spotReviewId).filter((v): v is string => !!v))];
  // like は actorIds（複数）を、それ以外は actorId（単数）をいいね者/行為者として使う
  const actorIds  = [...new Set([
    ...rows.map(r => r.actorId).filter((v): v is string => !!v),
    ...rows.flatMap(r => r.actorIds),
  ])];

  const [posts, stocks, reviews, actors] = await Promise.all([
    postIds.length   ? prisma.post.findMany({      where: { id: { in: postIds } },   select: { id: true, imageUrl: true, gachaId: true } }) : [],
    stockIds.length  ? prisma.stockPost.findMany({ where: { id: { in: stockIds } },  select: { id: true, gachaId: true } }) : [],
    reviewIds.length ? prisma.spotReview.findMany({where: { id: { in: reviewIds } }, select: { id: true } }) : [],
    actorIds.length  ? prisma.user.findMany({      where: { id: { in: actorIds } },  select: { id: true, name: true, image: true } }) : [],
  ]);
  const postMap   = new Map(posts.map(p => [p.id, p]));
  const stockMap  = new Map(stocks.map(s => [s.id, s]));
  const reviewSet = new Set(reviews.map(r => r.id));
  const actorMap  = new Map(actors.map(a => [a.id, a]));

  // ガチャ画像（在庫報告/お気に入りのサムネ・投稿写真が無い場合のフォールバック）
  const gachaIds = [...new Set([
    ...rows.map(r => r.gachaId).filter((v): v is string => !!v),
    ...posts.map(p => p.gachaId),
    ...stocks.map(s => s.gachaId),
  ])];
  const gachas = gachaIds.length
    ? await prisma.gacha.findMany({ where: { id: { in: gachaIds } }, select: { id: true, imageUrl: true } })
    : [];
  const gachaImg = new Map(gachas.map(g => [g.id, g.imageUrl]));

  const thumbnailFor = (n: (typeof rows)[number]): string | null => {
    if (n.postId) {
      const p = postMap.get(n.postId);
      if (p?.imageUrl) return p.imageUrl;              // 投稿写真を優先
      if (p?.gachaId) return gachaImg.get(p.gachaId) ?? null; // 無ければ対象ガチャ画像
      return null;
    }
    if (n.stockPostId) {
      const s = stockMap.get(n.stockPostId);
      return s?.gachaId ? gachaImg.get(s.gachaId) ?? null : null;
    }
    if (n.gachaId) return gachaImg.get(n.gachaId) ?? null; // favorite_stock
    return null;
  };

  // 参照先（投稿/在庫報告/口コミ）が削除済みの通知は一覧に出さない
  const alive = rows.filter(n => {
    if (n.postId       && !postMap.has(n.postId))         return false;
    if (n.stockPostId  && !stockMap.has(n.stockPostId))   return false;
    if (n.spotReviewId && !reviewSet.has(n.spotReviewId)) return false;
    return true;
  });

  const base = (n: (typeof rows)[number]): NotificationView => ({
    id: n.id, type: n.type, title: n.title, body: n.body,
    gachaId: n.gachaId, spotId: n.spotId, postId: n.postId,
    stockPostId: n.stockPostId, spotReviewId: n.spotReviewId,
    read: n.read, createdAt: n.createdAt,
    actors: [], actorCount: 0, thumbnailUrl: thumbnailFor(n),
  });

  const out: NotificationView[] = [];
  // like は「対象」ごとに集約（新しい順で最初に出現した位置を保持）
  const likeAgg = new Map<string, { view: NotificationView; ids: Set<string> }>();

  for (const n of alive) {
    // その行のいいね者/行為者ID一覧（新しい順）。actorIds があればそれを、無ければ actorId を使う
    const rowActorIds = n.actorIds.length ? n.actorIds : (n.actorId ? [n.actorId] : []);
    if (n.type === 'like') {
      const key = n.postId ?? n.stockPostId ?? n.spotReviewId ?? n.id;
      let agg = likeAgg.get(key);
      if (!agg) {
        const view = base(n);
        agg = { view, ids: new Set() };
        likeAgg.set(key, agg);
        out.push(view);
      }
      for (const aid of rowActorIds) {
        if (agg.ids.has(aid)) continue;
        const au = actorMap.get(aid);
        if (!au) continue;
        agg.ids.add(aid);
        agg.view.actorCount = agg.ids.size;
        if (agg.view.actors.length < NOTIF_ACTOR_CAP) agg.view.actors.push(au);
      }
      if (!n.read) agg.view.read = false; // どれか未読なら未読扱い
    } else {
      const view = base(n);
      const first = rowActorIds[0] ? actorMap.get(rowActorIds[0]) ?? null : null;
      if (first) { view.actors = [first]; view.actorCount = 1; }
      out.push(view);
    }
  }

  return out;
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

/** handle（@ユーザー名）の配列からユーザーを解決（メンション通知の宛先特定用） */
export const getUsersByHandles = (handles: string[]) =>
  prisma.user.findMany({
    where: { profile: { handle: { in: handles } } },
    select: { id: true, name: true, profile: { select: { handle: true } } },
  });

export const findPublicPost = (id: string) =>
  prisma.post.findFirst({ where: { id }, select: { userId: true, spotId: true } });

export const findPublicStockPost = (id: string) =>
  prisma.stockPost.findFirst({ where: { id }, select: { userId: true, spotId: true } });

export const findPublicSpotReview = (id: string) =>
  prisma.spotReview.findFirst({ where: { id }, select: { userId: true, spotId: true } });

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
  prisma.notification.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, actorId: true, actorIds: true },
  });

/** 対象のいいね通知を全件（過去の1いいね1行の名残も含めて）取得 */
export const listLikeNotifications = (where: Prisma.NotificationWhereInput) =>
  prisma.notification.findMany({
    where,
    select: { id: true, actorId: true, actorIds: true },
  });

/** 通知を部分更新（いいね者の付け替え等） */
export const updateNotification = (id: string, data: Prisma.NotificationUncheckedUpdateInput) =>
  prisma.notification.update({ where: { id }, data });

export const deleteLikeNotification = (where: Prisma.NotificationWhereInput) =>
  prisma.notification.deleteMany({ where });

/** 既読かつ cutoff より前に作成された通知を削除（自動クリーンアップ用） */
export const deleteReadNotificationsBefore = (cutoff: Date) =>
  prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: cutoff } } });

// ─── Announcement（お知らせ） ───────────────────────────────────────────────────

export interface PublishedAnnouncementRow {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  publishedAt: Date | null;
  read: boolean;
}

const PUBLISHED_ANNOUNCEMENT_SELECT = {
  id: true,
  title: true,
  body: true,
  imageUrl: true,
  publishedAt: true,
  readByUserIds: true,
} as const;

const toPublishedAnnouncementRow = (
  row: {
    id: string;
    title: string;
    body: string;
    imageUrl: string;
    publishedAt: Date | null;
    readByUserIds: string[];
  },
  userId: string,
): PublishedAnnouncementRow => ({
  id: row.id,
  title: row.title,
  body: row.body,
  imageUrl: row.imageUrl,
  publishedAt: row.publishedAt,
  read: row.readByUserIds.includes(userId),
});

/** 公開済みお知らせの未読数（readByUserIds に含まれない件数） */
export const getUnreadAnnouncementCount = (userId: string) =>
  prisma.announcement.count({
    where: {
      status: 'published',
      NOT: { readByUserIds: { has: userId } },
    },
  });

/** 公開済みお知らせ一覧（新しい順・ユーザーごとの既読フラグ付き） */
export const listPublishedAnnouncementsForUser = async (userId: string): Promise<PublishedAnnouncementRow[]> => {
  const rows = await prisma.announcement.findMany({
    where: { status: 'published' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: PUBLISHED_ANNOUNCEMENT_SELECT,
  });
  return rows.map((row) => toPublishedAnnouncementRow(row, userId));
};

/** 公開済みお知らせ1件（詳細表示用・ユーザーごとの既読フラグ付き） */
export const getPublishedAnnouncementByIdForUser = async (
  id: string,
  userId: string,
): Promise<PublishedAnnouncementRow | null> => {
  const row = await prisma.announcement.findFirst({
    where: { id, status: 'published' },
    select: PUBLISHED_ANNOUNCEMENT_SELECT,
  });
  return row ? toPublishedAnnouncementRow(row, userId) : null;
};

/** 公開済みお知らせを既読化（未読のみ readByUserIds に userId を追加） */
export const markPublishedAnnouncementsAsRead = async (userId: string) => {
  const unread = await prisma.announcement.findMany({
    where: {
      status: 'published',
      NOT: { readByUserIds: { has: userId } },
    },
    select: { id: true },
  });
  if (unread.length === 0) return;

  await prisma.$transaction(
    unread.map(({ id }) =>
      prisma.announcement.update({
        where: { id },
        data: { readByUserIds: { push: userId } },
      }),
    ),
  );
};

// ─── Post（通常投稿） ───────────────────────────────────────────────────────────

const FEED_USER_SELECT  = { id: true, name: true, image: true, profile: { select: { handle: true } } } as const;
const FEED_SPOT_SELECT  = { id: true, name: true, address: true, lat: true, lng: true } as const;
const FEED_GACHA_SELECT = { id: true, ...IP_NAME_SELECT, seriesName: true, gradientFrom: true, gradientTo: true, imageUrl: true } as const;
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

export async function getUserGachaLikesWithIp(userId: string) {
  const rows = await prisma.gachaLike.findMany({
    where: { userId },
    select: { gachaId: true, gacha: { select: { ...IP_NAME_SELECT } } },
  });
  return rows.map(flatGacha);
}

// 在庫の鮮度窓（この日数より古い在庫報告はフィードに出さない＝誤情報を除外）。
// 量が増えたらここを縮める。通常投稿は制限なし（新着＋カーソルで自然に沈む）。
export const STOCK_FEED_FRESH_DAYS = 7;

const FEED_INCLUDE = {
  user:   { select: FEED_USER_SELECT },
  spot:   { select: FEED_SPOT_SELECT },
  gacha:  { select: FEED_GACHA_SELECT },
  _count: { select: { likes: true, replies: true } },
} as const;

type FeedIdOpts = {
  spotId?: string | null;
  gachaIds?: string[] | null;
  likedGachaIds: string[];
  likedIps: string[];
  limit: number;
  offset: number;
};

// 好み(いいねガチャ→同IP→その他)＋新着 の順に並べた「在庫」の ID を limit 件だけ返す。
// 同一マシンは DISTINCT ON で最新のみに畳んでから並べる（15件に絞っても dedup で減らない）。
export async function getFeedStockIds(opts: FeedIdOpts): Promise<string[]> {
  const { spotId, gachaIds, likedGachaIds, likedIps, limit, offset } = opts;
  const freshSince = new Date(Date.now() - STOCK_FEED_FRESH_DAYS * 24 * 60 * 60 * 1000);
  const conds: Prisma.Sql[] = [
    Prisma.sql`sp."createdAt" >= ${freshSince}`,
    Prisma.sql`g."status" = 'on_sale'`,
  ];
  if (spotId) conds.push(Prisma.sql`sp."spotId" = ${spotId}`);
  if (gachaIds && gachaIds.length > 0) conds.push(Prisma.sql`sp."gachaId" = ANY(${gachaIds}::text[])`);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT latest.id FROM (
      SELECT DISTINCT ON (sp."machineId") sp.id, sp."createdAt", sp."gachaId", ipn."name" AS "ipName"
      FROM "StockPost" sp
      JOIN "Gacha" g ON g.id = sp."gachaId"
      LEFT JOIN "IpName" ipn ON ipn.id = g."ipNameId"
      WHERE ${Prisma.join(conds, ' AND ')}
      ORDER BY sp."machineId", sp."createdAt" DESC, sp.id DESC
    ) latest
    ORDER BY
      CASE WHEN latest."gachaId" = ANY(${likedGachaIds}::text[]) THEN 0
           WHEN latest."ipName"  = ANY(${likedIps}::text[])      THEN 1
           ELSE 2 END,
      latest."createdAt" DESC, latest.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map(r => r.id);
}

// 好み＋新着 の順に並べた「通常投稿」の ID を limit 件だけ返す（鮮度窓なし・dedupなし）。
export async function getFeedPostIds(opts: FeedIdOpts): Promise<string[]> {
  const { spotId, gachaIds, likedGachaIds, likedIps, limit, offset } = opts;
  const conds: Prisma.Sql[] = [Prisma.sql`g."status" = 'on_sale'`];
  if (spotId) conds.push(Prisma.sql`p."spotId" = ${spotId}`);
  if (gachaIds && gachaIds.length > 0) conds.push(Prisma.sql`p."gachaId" = ANY(${gachaIds}::text[])`);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM "Post" p
    JOIN "Gacha" g ON g.id = p."gachaId"
    LEFT JOIN "IpName" ipn ON ipn.id = g."ipNameId"
    WHERE ${Prisma.join(conds, ' AND ')}
    ORDER BY
      CASE WHEN p."gachaId" = ANY(${likedGachaIds}::text[]) THEN 0
           WHEN ipn."name"  = ANY(${likedIps}::text[])      THEN 1
           ELSE 2 END,
      p."createdAt" DESC, p.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows.map(r => r.id);
}

// 2段目：ID 群の本体を include 付きで取得し、渡された ID 順に並べ直す。
export async function getStockPostsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = (await prisma.stockPost.findMany({ where: { id: { in: ids } }, include: FEED_INCLUDE })).map(flatGacha);
  const map = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => map.get(id)).filter((r): r is (typeof rows)[number] => r != null);
}

export async function getPostsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = (await prisma.post.findMany({ where: { id: { in: ids } }, include: FEED_INCLUDE })).map(flatGacha);
  const map = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => map.get(id)).filter((r): r is (typeof rows)[number] => r != null);
}

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
  } else {
    await prisma.stockPostLike.create({ data: { userId, stockPostId } });
  }
  // togglePostLike と同じく、最新の likeCount を数えて返す（サーバ値で確定=reconcileできるように）
  const likeCount = await prisma.stockPostLike.count({ where: { stockPostId } });
  return { liked: !existing, likeCount };
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
  prisma.spotReview.count({ where: { spotId } });

export const listSpotReviews = (spotId: string, skip: number, take: number) =>
  prisma.spotReview.findMany({
    where: { spotId },
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

const LIKE_NOTIF_TARGET_LABEL = (n: { postId: string | null; stockPostId: string | null; spotReviewId: string | null }) =>
  n.postId ? '投稿' : n.stockPostId ? '在庫報告' : n.spotReviewId ? '口コミ' : '投稿';

/** 退会（関連データは onDelete: Cascade。通知は退会前に明示クリーンアップ） */
export async function deleteUser(id: string) {
  await prisma.$transaction(async (tx) => {
    // 1. 投稿主（受信者）として届いている通知をすべて削除
    await tx.notification.deleteMany({ where: { userId: id } });

    // 2. 返信・メンション等: 行為者が退会者のみ → 通知ごと削除
    await tx.notification.deleteMany({
      where: { actorId: id, type: { not: 'like' } },
    });

    // 3. いいね: actorIds から退会者を除去（actorId が退会者なら次の人を actor に）
    const likeNotifs = await tx.notification.findMany({
      where: {
        type: 'like',
        OR: [{ actorId: id }, { actorIds: { has: id } }],
      },
    });

    for (const n of likeNotifs) {
      const list = n.actorIds.length ? n.actorIds : (n.actorId ? [n.actorId] : []);
      const remaining = list.filter((a) => a !== id);
      if (remaining.length === 0) {
        await tx.notification.delete({ where: { id: n.id } });
        continue;
      }
      const head = remaining[0];
      const headUser = await tx.user.findUnique({ where: { id: head }, select: { name: true } });
      const label = LIKE_NOTIF_TARGET_LABEL(n);
      await tx.notification.update({
        where: { id: n.id },
        data: {
          actorId: head,
          actorIds: remaining,
          body: `${headUser?.name ?? 'だれか'}さんがあなたの${label}にいいねしました`,
        },
      });
    }

    // 4. 被通報者として残っている通報（reportedUserId は onDelete: Restrict）
    await tx.report.deleteMany({ where: { reportedUserId: id } });

    await tx.user.delete({ where: { id } });
  });
}

/** ユーザー名を更新 */
export const updateUserName = (id: string, name: string) =>
  prisma.user.update({ where: { id }, data: { name } });

/** 生年月日を更新 */
export const updateUserBirthDate = (id: string, birthDate: Date) =>
  prisma.user.update({ where: { id }, data: { birthDate } });

/** メール認証済みに更新 */
export const markUserEmailVerified = (id: string) =>
  prisma.user.update({ where: { id }, data: { emailVerified: true } });

/** ユーザーの表示画像（User.image）を更新（プロフィールアイコンと同期・削除時はnull） */
export const updateUserImage = (id: string, image: string | null) =>
  prisma.user.update({ where: { id }, data: { image } });

export type ProfileUpsertData = {
  handle?: string;
  bio?: string;
  favoriteIps?: string[];
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
  gacha: { select: { id: true, ...IP_NAME_SELECT, seriesName: true, gradientFrom: true, gradientTo: true, imageUrl: true, status: true } },
  _count: { select: { likes: true, replies: true } },
} as const;

/** 指定ユーザーの「引いた！」投稿一覧（カード表示用のfull形状・新しい順・最大50件） */
export const getUserPosts = async (userId: string) =>
  (await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: PROFILE_POST_INCLUDE,
  })).map(flatGacha);

/** 指定ユーザーの在庫報告一覧（カード表示用のfull形状・新しい順・最大50件） */
export const getUserStockPosts = async (userId: string) =>
  (await prisma.stockPost.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: PROFILE_POST_INCLUDE,
  })).map(flatGacha);

/** 単体の投稿/在庫報告（カード表示用のfull形状。通知からの直接表示に使用） */
export const getPostById = async (id: string) => {
  const row = await prisma.post.findUnique({ where: { id }, include: PROFILE_POST_INCLUDE });
  return row ? flatGacha(row) : null;
};

export const getStockPostById = async (id: string) => {
  const row = await prisma.stockPost.findUnique({ where: { id }, include: PROFILE_POST_INCLUDE });
  return row ? flatGacha(row) : null;
};

/** 指定ユーザーのお気に入りガチャ一覧（公開・カード表示用のfull形状） */
export const getUserFavorites = async (userId: string) =>
  (await prisma.gachaLike.findMany({
    where: { userId },
    include: {
      gacha: {
        select: {
          id: true, seriesName: true, ...IP_NAME_SELECT, imageUrl: true,
          gradientFrom: true, gradientTo: true, status: true, releaseDate: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })).map(flatGacha);

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
    avatarUrl:   user.image ?? null,
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

export const getUserFavoriteGachas = async (userId: string) =>
  (await prisma.gachaLike.findMany({
    where: { userId },
    include: {
      gacha: {
        select: {
          id: true, seriesName: true, ...IP_NAME_SELECT, imageUrl: true,
          gradientFrom: true, gradientTo: true, status: true, releaseDate: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })).map(flatGacha);

export const deleteGachaLike = (userId: string, gachaId: string) =>
  prisma.gachaLike.deleteMany({ where: { userId, gachaId } });

/** #19: IpName テーブルから (ipName, categoryKey, ガチャ数) を返す（ip-groups 用）。各 ipName は単一カテゴリ。 */
export const groupGachaByIpAndCategory = async () => {
  const rows = await prisma.ipName.findMany({
    select: { name: true, category: { select: { key: true } }, _count: { select: { gachas: true } } },
  });
  return rows.map(r => ({ ipName: r.name, ipCategory: r.category.key, _count: { id: r._count.gachas } }));
};

const seriesTermsWhere = (terms: string[]): Prisma.GachaWhereInput =>
  terms.length === 1
    ? { seriesName: { contains: terms[0], mode: 'insensitive' } }
    : { OR: terms.map(t => ({ seriesName: { contains: t, mode: 'insensitive' as const } })) };

// #19: ipName の部分一致は ip リレーション名で判定する。
const ipTermsWhere = (terms: string[]): Prisma.GachaWhereInput =>
  terms.length === 1
    ? { ip: { name: { contains: terms[0], mode: 'insensitive' } } }
    : { OR: terms.map(t => ({ ip: { name: { contains: t, mode: 'insensitive' as const } } })) };

export const findOnSaleSeriesByExactIp = async (ipName: string) =>
  (await prisma.gacha.findMany({
    where: { status: 'on_sale', ip: { name: { equals: ipName, mode: 'insensitive' } } },
    // ipName も返す：IP完全一致時に「ジャンル候補」を組み立てるため（#17-4）
    select: { id: true, ...IP_NAME_SELECT, seriesName: true, imageUrl: true },
    // seriesName は 1:1（distinct は no-op）なので削除し、いいね数の多い順に
    orderBy: { gachaLikes: { _count: 'desc' } },
  })).map(flatIp);

export const suggestGachaSeries = (terms: string[]) =>
  prisma.gacha.findMany({
    where: { status: 'on_sale', ...seriesTermsWhere(terms) },
    select: { id: true, seriesName: true, imageUrl: true },
    // seriesName は 1:1（distinct は no-op）なので削除し、いいね数の多い順に
    orderBy: { gachaLikes: { _count: 'desc' } },
  });

/** IP候補は「配下ガチャの本数が多い順」。ipNameId で groupBy して IpName 名を引く。 */
export const suggestGachaIps = async (terms: string[]) => {
  const grouped = await prisma.gacha.groupBy({
    by: ['ipNameId'],
    where: { status: 'on_sale', ipNameId: { not: null }, ...ipTermsWhere(terms) },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  const ids = grouped.map(g => g.ipNameId).filter((v): v is string => v !== null);
  if (ids.length === 0) return [] as { ipName: string; _count: { id: number } }[];
  const names = await prisma.ipName.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const nameById = new Map(names.map(n => [n.id, n.name]));
  return grouped
    .map(g => ({ ipName: nameById.get(g.ipNameId as string) ?? '', _count: g._count }))
    .filter(x => x.ipName);
};

export const findOnSaleExactIp = async (ipName: string) => {
  const row = await prisma.gacha.findFirst({
    where: { status: 'on_sale', ip: { name: { equals: ipName, mode: 'insensitive' } } },
    select: { ...IP_NAME_SELECT },
  });
  return row ? flatIp(row) : null;
};

export const findGachaIdsByExactIp = async (ipName: string) =>
  (await prisma.gacha.findMany({
    where: { status: 'on_sale', ip: { name: { equals: ipName, mode: 'insensitive' } } },
    select: { id: true, ...IP_NAME_SELECT },
    orderBy: { gachaLikes: { _count: 'desc' } },   // gachaIds[0] が最人気に
  })).map(flatIp);

export const findGachaIdsBySeriesTerms = (terms: string[]) =>
  prisma.gacha.findMany({
    where: { status: 'on_sale', ...seriesTermsWhere(terms) },
    select: { id: true, seriesName: true },
    orderBy: { gachaLikes: { _count: 'desc' } },   // gachaIds[0] が最人気に
  });

export const findGachaIdsByIpTerms = async (terms: string[]) =>
  (await prisma.gacha.findMany({
    where: { status: 'on_sale', ...ipTermsWhere(terms) },
    select: { id: true, ...IP_NAME_SELECT },
    orderBy: { gachaLikes: { _count: 'desc' } },   // gachaIds[0] が最人気に
  })).map(flatIp);

// ─── Community / User 検索 ──────────────────────────────────────────────────────

export const getGachasWithLikeCount = async () =>
  (await prisma.gacha.findMany({
    select: {
      id: true, seriesName: true, ...IP_NAME_SELECT, imageUrl: true, gradientFrom: true, gradientTo: true,
      _count: { select: { gachaLikes: true } },
    },
    orderBy: { gachaLikes: { _count: 'desc' } },
  })).map(flatIp);

export const getUserLikedIpNames = async (userId: string): Promise<string[]> => {
  const rows = await prisma.gachaLike.findMany({ where: { userId }, select: { gacha: { select: { ...IP_NAME_SELECT } } } });
  return [...new Set(rows.map(r => r.gacha.ip?.name).filter((n): n is string => !!n))];
};

export const getGachaIdsByIpNames = async (ipNames: string[]): Promise<string[]> => {
  if (ipNames.length === 0) return [];
  const rows = await prisma.gacha.findMany({ where: { ip: { name: { in: ipNames } } }, select: { id: true } });
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
  profile: { select: { handle: true, bio: true } },
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

// ─── ホーム: カテゴリ別（発売中×いいね順） ────────────────────────────────────

// ホームの横スクロールカード（GachaCard）用の共通 select。
const CARD_SELECT = {
  id: true, seriesName: true, ...IP_NAME_SELECT,
  imageUrl: true, gradientFrom: true, gradientTo: true,
  status: true, releaseDate: true,
  _count: { select: { gachaLikes: true } },
} as const;

/** #19: 発売中のうち IpCategory.key が指定リストに含まれるものを、いいね数降順で take 件（excludeIds は除外）。 */
export const getOnSaleGachasByCategoryKeys = async (keys: string[], take: number, excludeIds: string[] = []) =>
  (await prisma.gacha.findMany({
    where: {
      status: 'on_sale',
      ip: { category: { key: { in: keys } } },
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take,
    select: CARD_SELECT,
  })).map(flatIp);

/** #19: 発売中のうち IpCategory.key が指定リストに含まれないもの（未linkの ipNameId=null も含む）を、いいね数降順で take 件。 */
export const getOnSaleGachasNotInCategoryKeys = async (keys: string[], take: number, excludeIds: string[] = []) =>
  (await prisma.gacha.findMany({
    where: {
      status: 'on_sale',
      OR: [
        { ipNameId: null },
        { ip: { category: { key: { notIn: keys } } } },
      ],
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take,
    select: CARD_SELECT,
  })).map(flatIp);

// ─── #19 IP正規化（IpCategory / IpName） ─────────────────────────────────────

/** IpCategory を key で upsert（表示名・並び順を同期）し、行を返す */
export const upsertIpCategory = (key: string, name: string, sortOrder: number) =>
  prisma.ipCategory.upsert({
    where:  { key },
    update: { name, sortOrder },
    create: { key, name, sortOrder },
  });

/** IpName を name で upsert（所属カテゴリを同期）し、行を返す */
export const upsertIpName = (name: string, categoryId: string) =>
  prisma.ipName.upsert({
    where:  { name },
    update: { categoryId },
    create: { name, categoryId },
  });

/** IpName を name で取得（存在すれば id と現カテゴリ key。スクレイプ時の link 判定用） */
export const getIpNameByName = (name: string) =>
  prisma.ipName.findUnique({ where: { name }, select: { id: true, category: { select: { key: true } } } });

/** signup 用: IpCategory を表示順で、配下 IpName（配下ガチャ数付き）とともに取得 */
export const getIpCategoriesWithIpNames = () =>
  prisma.ipCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      key:  true,
      name: true,
      ipNames: {
        select: {
          id:   true,
          name: true,
          _count: { select: { gachas: true } },
        },
      },
    },
  });

// ─── スクレイピング予約設定（DB管理） ─────────────────────────────────────────

/** 予約設定を取得（type='gacha'|'phone'）。未設定なら null。 */
export const getScrapeSchedule = (type: string) =>
  prisma.scrapeSchedule.findUnique({ where: { type } });

/** 予約設定を upsert（everyDays 1〜7 / atTime "HH:MM"）。 */
export const upsertScrapeSchedule = (type: string, everyDays: number, atTime: string) =>
  prisma.scrapeSchedule.upsert({
    where:  { type },
    update: { everyDays, atTime },
    create: { type, everyDays, atTime },
  });

// ─── 通報 ─────────────────────────────────────────────────────────────────────

export const createReport = (data: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reportedUserId: string;
  reasonKeys: string[];
  detail?: string | null;
}) => {
  const detail = data.detail?.trim() || null;
  return prisma.report.create({
    data: {
      reporterId: data.reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      reportedUserId: data.reportedUserId,
      reasonKeys: data.reasonKeys,
      detail,
    },
  });
};

// ─── 問い合わせ ───────────────────────────────────────────────────────────────

export const createInquiry = (data: { userId: string; body: string }) =>
  prisma.inquiry.create({
    data: {
      userId: data.userId,
      body: data.body.trim(),
    },
  });

// ─── User（認証） ─────────────────────────────────────────────────────────────

export const findUserIdByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email }, select: { id: true } });

export const findUserAuthByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });

export const findUserAuthById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: { id: true, email: true, isActive: true } });

export const getUserIsActiveById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: { isActive: true } });

// ─── SignupPending ────────────────────────────────────────────────────────────

export const signupPendingPublicSelect = {
  email: true,
  expiresAt: true,
  passwordEnc: true,
  name: true,
  birthDate: true,
  handle: true,
} as const;

export const deleteExpiredSignupPendingRows = () =>
  prisma.signupPending.deleteMany({ where: { expiresAt: { lt: new Date() } } });

export const upsertSignupPendingRow = (args: {
  email: string;
  tokenHash: string;
  expiresAt: Date;
}) =>
  prisma.signupPending.upsert({
    where: { email: args.email },
    create: {
      email: args.email,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
    },
    update: {
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      passwordEnc: null,
      name: null,
      birthDate: null,
      handle: null,
    },
  });

export const findSignupPendingByTokenHash = (tokenHash: string) =>
  prisma.signupPending.findUnique({
    where: { tokenHash },
    select: { ...signupPendingPublicSelect, tokenHash: true },
  });

export const deleteSignupPendingByTokenHash = (tokenHash: string) =>
  prisma.signupPending.deleteMany({ where: { tokenHash } });

export const deleteSignupPendingByEmail = (email: string) =>
  prisma.signupPending.deleteMany({ where: { email } });

export const updateSignupPendingByTokenHash = (
  tokenHash: string,
  data: {
    passwordEnc?: string | null;
    name?: string | null;
    birthDate?: Date | null;
    handle?: string | null;
  },
) =>
  prisma.signupPending.update({
    where: { tokenHash },
    data,
    select: signupPendingPublicSelect,
  });

// ─── Verification（OTP / quick login） ───────────────────────────────────────

export const findVerificationByIdentifier = (identifier: string) =>
  prisma.verification.findFirst({
    where: { identifier },
    orderBy: { createdAt: 'desc' },
  });

export const deleteVerificationsByIdentifier = (identifier: string) =>
  prisma.verification.deleteMany({ where: { identifier } });

export const createVerificationRow = (data: {
  identifier: string;
  value: string;
  expiresAt: Date;
}) => prisma.verification.create({ data });

export const deleteVerificationById = (id: string) =>
  prisma.verification.delete({ where: { id } });

export const deleteQuickLoginVerificationsForUser = (identifierPrefix: string, userId: string) =>
  prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: identifierPrefix },
      value: userId,
    },
  });

// ─── 通報対象のユーザー解決 ───────────────────────────────────────────────────

export const findPostReportOwnerId = (id: string) =>
  prisma.post.findUnique({ where: { id }, select: { userId: true } });

export const findStockPostReportOwnerId = (id: string) =>
  prisma.stockPost.findUnique({ where: { id }, select: { userId: true } });

export const findPostReplyReportOwnerId = (id: string) =>
  prisma.postReply.findUnique({ where: { id }, select: { userId: true } });

export const findStockPostReplyReportOwnerId = (id: string) =>
  prisma.stockPostReply.findUnique({ where: { id }, select: { userId: true } });

export const findSpotReviewReportOwnerId = (id: string) =>
  prisma.spotReview.findUnique({ where: { id }, select: { userId: true } });

export const findSpotReviewReplyReportOwnerId = (id: string) =>
  prisma.spotReviewReply.findUnique({ where: { id }, select: { userId: true } });

export const findUserReportOwnerId = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: { id: true } });
