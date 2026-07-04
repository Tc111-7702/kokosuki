import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as db from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const raw = await db.getSpotById(id);
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const spot = {
      id: raw.id,
      name: raw.name,
      address: raw.address,
      lat: raw.lat,
      lng: raw.lng,
      phone: raw.phone,
      googleMapsUrl: raw.googleMapsUrl,
      gachaIds: raw.machines.map((m) => m.gachaId),
      stockMap: Object.fromEntries(
        raw.machines.filter((m) => m.stockStatus).map((m) => [m.gachaId, m.stockStatus as string])
      ),
      distance: 0,
    };

    return NextResponse.json({ spot });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
