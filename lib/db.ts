import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// ─── Prismaクライアント（シングルトン） ───────────────────────────────────────

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false }, // Supabase は dev/prod 両方 SSL 必要
  });
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
}

// ─── DBメソッド集約オブジェクト ──────────────────────────────────────────────
//
// バックエンドからは `import { db } from '@/lib/db'` して
// `db.methodName(args)` の形式で呼び出す。
// prisma を直接たたくのはこのファイルだけにする。

export const db = {

  // ── UserProfile ──────────────────────────────────────────────────────────

  /** ハンドル名でプロフィールを検索（重複チェック用） */
  findProfileByHandle: (handle: string) =>
    prisma.userProfile.findUnique({ where: { handle } }),

  /** userId でプロフィールを取得 */
  findProfileByUserId: (userId: string) =>
    prisma.userProfile.findUnique({ where: { userId } }),

  /** プロフィールを作成 or 更新 */
  upsertProfile: (userId: string, handle: string, favoriteIps: string[]) =>
    prisma.userProfile.upsert({
      where:  { userId },
      update: { handle, favoriteIps },
      create: { userId, handle, favoriteIps },
    }),

  // ── GachaLike ────────────────────────────────────────────────────────────

  /** 複数のガチャいいねを一括作成（重複スキップ） */
  createGachaLikes: (userId: string, gachaIds: string[]) =>
    prisma.gachaLike.createMany({
      data: gachaIds.map((gachaId) => ({ userId, gachaId })),
      skipDuplicates: true,
    }),

  // ── Spot ─────────────────────────────────────────────────────────────────

  /** gachaIslandId でスポットを検索 */
  findSpotByGachaIslandId: (gachaIslandId: number) =>
    prisma.spot.findUnique({ where: { gachaIslandId } }),

  /** gacha-island.jp 店舗データで Spot を upsert（gachaIslandId で重複排除） */
  upsertSpotFromGachaIsland: (data: {
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
    }),

  /** Google Places 由来データで Spot を upsert（googlePlaceId で重複排除） */
  upsertSpot: (data: SpotUpsertData) =>
    prisma.spot.upsert({
      where:  { googlePlaceId: data.googlePlaceId },
      update: {
        name:         data.name,
        address:      data.address,
        lat:          data.lat,
        lng:          data.lng,
        phone:        data.phone,
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
    }),

  /**
   * バウンディングボックスで絞ったスポット一覧を返す（JS側でHaversine距離フィルタ）
   * machinesも含め、gachaIdsをクライアント側フィルタリングに使用
   */
  findSpotsNearby: (lat: number, lng: number, radiusMeters: number, addressContains?: string) => {
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
  },

  /** gachaIslandId を持つ全スポットを取得（Machineスクレイパー用） */
  findSpotsWithGachaIslandId: () =>
    prisma.spot.findMany({ where: { gachaIslandId: { not: null } } }),

  /** googlePlaceId を持つ全スポットを取得（電話番号取得用） */
  findSpotsWithPlaceId: () =>
    prisma.spot.findMany({
      where: { googlePlaceId: { not: null } },
      select: { id: true, googlePlaceId: true, phone: true },
    }),

  /** googlePlaceId を更新 */
  updateSpotPlaceId: (id: string, googlePlaceId: string) =>
    prisma.spot.update({ where: { id }, data: { googlePlaceId } }),

  /** googlePlaceId がない gachaIsland 由来スポットを取得 */
  findSpotsWithoutPlaceId: () =>
    prisma.spot.findMany({
      where: { gachaIslandId: { not: null }, googlePlaceId: null },
      select: { id: true, name: true, address: true, lat: true, lng: true },
    }),

  /** 電話番号を更新 */
  updateSpotPhone: (id: string, phone: string) =>
    prisma.spot.update({ where: { id }, data: { phone } }),

  // ── Gacha ────────────────────────────────────────────────────────────────

  /**
   * フィルターUI用: 全ipName一覧 + ガチャ一覧(id, seriesName, ipName)を返す
   */
  getGachaFilters: async () => {
    const items = await prisma.gacha.findMany({
      select: { id: true, seriesName: true, ipName: true, imageUrl: true },
      orderBy: [{ ipName: 'asc' }, { seriesName: 'asc' }],
    });
    const ipNames = [...new Set(items.map((g) => g.ipName))].sort();
    return { ipNames, items };
  },

  /** wpPostId で Gacha を検索 */
  findGachaByWpPostId: (wpPostId: number) =>
    prisma.gacha.findUnique({ where: { wpPostId } }),

  /** スクレイパー由来データで Gacha を upsert（wpPostId で重複排除） */
  upsertGachaFromScraper: (data: GachaUpsertData) =>
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
      },
    }),

  // ── Machine ──────────────────────────────────────────────────────────────

  /** spotId + gachaId で Machine を upsert（重複排除） */
  upsertMachine: (spotId: string, gachaId: string) =>
    prisma.machine.upsert({
      where:  { spotId_gachaId: { spotId, gachaId } },
      update: { updatedAt: new Date() },
      create: { spotId, gachaId },
    }),

};
