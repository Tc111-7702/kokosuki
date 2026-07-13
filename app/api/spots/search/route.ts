import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// GET /api/spots/search?name=xxx[&suggest=1][&lat=x&lng=y]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name    = searchParams.get('name') ?? '';
  const suggest = searchParams.get('suggest') === '1';
  const lat     = Number(searchParams.get('lat') ?? 0);
  const lng     = Number(searchParams.get('lng') ?? 0);
  const gachaId = searchParams.get('gachaId') ?? undefined;

  if (!name.trim()) return NextResponse.json({ spot: null, suggestions: [] });

  if (suggest) {
    const spots = await prisma.spot.findMany({
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

    type SpotRow = { id: string; name: string; address: string; lat: number; lng: number; distance?: number };
    let results: SpotRow[] = spots;
    if (lat && lng) {
      results = spots
        .map(s => ({ ...s, distance: Math.round(haversine(lat, lng, s.lat, s.lng)) }))
        .sort((a, b) => a.distance - b.distance);
    }
    return NextResponse.json({ suggestions: results.slice(0, 50) });
  }

  const spots = await prisma.spot.findMany({
    where: { name: { contains: name, mode: 'insensitive' } },
    include: { machines: { select: { gachaId: true, stockStatus: true } } },
  });

  if (spots.length === 0) return NextResponse.json({ spot: null });

  const best = (lat && lng)
    ? spots.reduce((a, b) => {
        const da = haversine(lat, lng, a.lat, a.lng);
        const db = haversine(lat, lng, b.lat, b.lng);
        return da <= db ? a : b;
      })
    : spots[0];

  const { machines, ...rest } = best;
  return NextResponse.json({
    spot: {
      ...rest,
      gachaIds: machines.map(m => m.gachaId),
      stockMap: Object.fromEntries(
        machines.filter(m => m.stockStatus).map(m => [m.gachaId, m.stockStatus!])
      ),
      distance: (lat && lng) ? Math.round(haversine(lat, lng, best.lat, best.lng)) : 0,
    }
  });
}
