import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ favoriteIps: [], gachas: [] });
    }

    const profile = await db.findProfileByUserId(session.user.id);
    const favoriteIps: string[] = profile?.favoriteIps ?? [];

    if (favoriteIps.length === 0) {
      return NextResponse.json({ favoriteIps: [], gachas: [] });
    }

    const gachas = await db.getRecommendedGachas(favoriteIps, 20);
    return NextResponse.json({ favoriteIps, gachas });
  } catch {
    return NextResponse.json({ favoriteIps: [], gachas: [] });
  }
}
