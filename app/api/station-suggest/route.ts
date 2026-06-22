import { NextResponse } from 'next/server';
import stationsData from '@/lib/japan-stations.json';

interface Station {
  name: string;
  pref: string;
  operator: string;
  lat: number;
  lng: number;
}

const stations = stationsData as Station[];

async function reverseGeocodeStation(lat: number, lng: number, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${token}&language=ja&limit=1&types=place,locality,address`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const ctx: { id: string; text: string }[] = feature.context ?? [];
    const place  = ctx.find(c => c.id.startsWith('place') || c.id.startsWith('locality'));
    const region = ctx.find(c => c.id.startsWith('region'));
    if (place && region) return `${region.text} ${place.text}`;
    if (region) return region.text;
    return null;
  } catch {
    return null;
  }
}

// GET /api/station-suggest?q=大阪
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ suggestions: [] });

  const lower = q.toLowerCase();
  const cleanQ = lower.endsWith('駅') ? lower.slice(0, -1) : lower;

  const matched = stations.filter(s => {
    const name = s.name.toLowerCase();
    return name.includes(cleanQ) || name.startsWith(cleanQ);
  });

  matched.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(cleanQ) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(cleanQ) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.name.localeCompare(b.name, 'ja');
  });

  const top = matched.slice(0, 20);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  // 並列逆ジオコーディング
  const addresses = await Promise.all(
    top.map((s: Station) => reverseGeocodeStation(s.lat, s.lng, token))
  );

  const suggestions = top.map((s: Station, i: number) => ({
    label: `${s.name}駅`,
    sublabel: (addresses[i] ?? s.pref) + (s.operator ? ` · ${s.operator}` : ''),
    lat: s.lat,
    lng: s.lng,
  }));

  return NextResponse.json({ suggestions });
}
