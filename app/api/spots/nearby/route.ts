import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/spots/nearby?lat=X&lng=Y[&radius=20000][&gachaId=XXX][&limit=7]
// radius を省略したときは範囲を切らず、現在地から近い順に limit 件（既定7）返す。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat             = Number(searchParams.get('lat'));
  const lng             = Number(searchParams.get('lng'));
  const radiusRaw       = searchParams.get('radius');
  const addressContains = searchParams.get('addressContains') ?? undefined;
  const gachaId         = searchParams.get('gachaId') ?? undefined;
  const limitParam      = searchParams.get('limit');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat と lng は必須です' }, { status: 400 });
  }

  if (radiusRaw == null || radiusRaw === '') {
    const limit = Math.min(Number(limitParam ?? '7') || 7, 50);
    const spots = await db.findClosestSpots(lat, lng, limit, gachaId).catch(() => []);
    return NextResponse.json({ spots });
  }

  const radius = Number(radiusRaw);
  const candidates = await db.findSpotsNearby(lat, lng, radius, addressContains).catch(() => []);
  let spots = candidates
    .map(({ machines, ...spot }) => ({
      ...spot,
      gachaIds: machines.map((m) => m.gachaId),
      stockMap: Object.fromEntries(
        machines
          .filter((m) => m.stockStatus)
          .map((m) => [m.gachaId, m.stockStatus as string])
      ),
      distance: Math.round(haversine(lat, lng, spot.lat, spot.lng)),
    }))
    .filter((spot) =>
      spot.distance <= radius &&
      spot.gachaIds.length > 0 &&
      (gachaId ? spot.gachaIds.includes(gachaId) : true)
    )
    .sort((a, b) => a.distance - b.distance);

  const limit = limitParam ? Number(limitParam) : (gachaId ? 7 : undefined);
  if (limit && limit > 0) spots = spots.slice(0, limit);

  return NextResponse.json({ spots });
}
