import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

/** POST /api/users/[userId]/block — ブロックする / 解除する */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId: targetId } = await params;
    if (targetId === session.user.id) {
      return NextResponse.json({ error: '自分自身はブロックできません' }, { status: 400 });
    }
    const target = await db.getUserById(targetId);
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const blocked = body?.blocked === true;
    await db.setUserBlocked(session.user.id, targetId, blocked);
    return NextResponse.json({ blocked });
  } catch (e) {
    console.error('[users block]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
