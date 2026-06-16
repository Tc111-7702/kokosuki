import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { kansaiShopsPoller } from '@/lib/scrapers/gacha-island-shops';

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

// GET /api/spots/nearby?lat=X&lng=Y&radius=20000
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat    = Number(searchParams.get('lat'));
  const lng    = Number(searchParams.get('lng'));
  const radius = Number(searchParams.get('radius') ?? '20000');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat と lng は必須です' }, { status: 400 });
  }

  if (!kansaiShopsPoller.isRunning()) {
    kansaiShopsPoller.start();
  }

  const candidates = await db.findSpotsNearby(lat, lng, radius);
  const spots = candidates
    .map(({ machines, ...spot }) => ({
      ...spot,
      gachaIds: machines.map((m) => m.gachaId),
      distance: Math.round(haversine(lat, lng, spot.lat, spot.lng)),
    }))
    .filter((spot) => spot.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  return NextResponse.json({ spots });
}
