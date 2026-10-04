import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// GET /api/users/[userId]/favorites — ログイン中のみ
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId } = await params;
    const rows = await db.getUserFavorites(userId);
    return NextResponse.json({ gachas: rows.map((r) => r.gacha) });
  } catch (e) {
    console.error('[users favorites]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
