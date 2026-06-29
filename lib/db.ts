import { PrismaClient } from '@prisma/client';
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
}

// ─── DBメソッド集約 ──────────────────────────────────────────────────────────

export const db = {

  // ── UserProfile ──────────────────────────────────────────────────────────

  findProfileByHandle: (handle: string) =>
    prisma.userProfile.findUnique({ where: { handle } }),

  findProfileByUserId: (userId: string) =>
    prisma.userProfile.findUnique({ where: { userId } }),

  upsertProfile: (userId: string, handle: string, favoriteIps: string[]) =>
    prisma.userProfile.upsert({
      where:  { userId },
      update: { handle, favoriteIps },
      create: { userId, handle, favoriteIps },
    }),

  // ── GachaLike ────────────────────────────────────────────────────────────

  createGachaLikes: (userId: string, gachaIds: string[]) =>
    prisma.gachaLike.createMany({
      data: gachaIds.map((gachaId) => ({ userId, gachaId })),
      skipDuplicates: true,
    }),

  // ── Spot ─────────────────────────────────────────────────────────────────

  findSpotByGachaIslandId: (gachaIslandId: number) =>
    prisma.spot.findUnique({ where: { gachaIslandId } }),

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

  upsertSpot: (data: SpotUpsertData) =>
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
    }),

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

  findSpotsWithGachaIslandId: () =>
    prisma.spot.findMany({ where: { gachaIslandId: { not: null } } }),

  findSpotsWithPlaceId: () =>
    prisma.spot.findMany({
      where: { googlePlaceId: { not: null } },
      select: { id: true, googlePlaceId: true, phone: true },
    }),

  updateSpotPlaceId: (id: string, googlePlaceId: string) =>
    prisma.spot.update({ where: { id }, data: { googlePlaceId } }),

  findSpotsWithoutPlaceId: () =>
    prisma.spot.findMany({
      where: { gachaIslandId: { not: null }, googlePlaceId: null },
      select: { id: true, name: true, address: true, lat: true, lng: true },
    }),

  updateSpotPhone: (id: string, phone: string) =>
    prisma.spot.update({ where: { id }, data: { phone } }),

  // ── Gacha ────────────────────────────────────────────────────────────────

  getGachaFilters: async () => {
    const items = await prisma.gacha.findMany({
      where: { status: 'on_sale' },
      select: { id: true, seriesName: true, ipName: true, imageUrl: true },
      orderBy: [{ ipName: 'asc' }, { seriesName: 'asc' }],
    });
    const ipNames = [...new Set(items.map((g) => g.ipName))].sort();
    return { ipNames, items };
  },

  findGachaByWpPostId: (wpPostId: number) =>
    prisma.gacha.findUnique({ where: { wpPostId } }),

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
        price:       data.price,
        lineup:      data.lineup,
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
      },
    }),

  getGachaById: (id: string) =>
    prisma.gacha.findUnique({ where: { id } }),

  getPopularGachas: async (limit = 20) => {
    const rows = await prisma.gacha.findMany({
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
  },

  getRecommendedGachas: async (favoriteIps: string[], limit = 20) => {
    if (favoriteIps.length === 0) return [];
    const rows = await prisma.gacha.findMany({
      where: { ipName: { in: favoriteIps } },
      orderBy: { gachaLikes: { _count: 'desc' } },
      take: limit,
      select: {
        id: true, seriesName: true, ipName: true,
        imageUrl: true, gradientFrom: true, gradientTo: true,
        status: true,
        _count: { select: { gachaLikes: true } },
      },
    });
    return rows.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }));
  },

  // ── Machine ──────────────────────────────────────────────────────────────

  upsertMachine: (spotId: string, gachaId: string) =>
    prisma.machine.upsert({
      where:  { spotId_gachaId: { spotId, gachaId } },
      update: { updatedAt: new Date() },
      create: { spotId, gachaId },
    }),

};
