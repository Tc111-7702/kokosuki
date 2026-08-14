import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '20'), 50);

  // お気に入り済みは表示しない（未ログインは除外なし）
  const session = await auth.api.getSession({ headers: await headers() });
  const excludeIds = session?.user?.id ? await db.getLikedGachaIds(session.user.id) : [];

  const gachas = await db.getPopularGachas(limit, excludeIds);
  return NextResponse.json({ gachas });
}
