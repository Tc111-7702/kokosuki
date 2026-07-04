import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// GET: いいね状態と件数を取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    const [count, like] = await Promise.all([
      db.getGachaLikeCount(id),
      session?.user?.id ? db.getGachaLike(session.user.id, id) : null,
    ]);

    return NextResponse.json({ liked: !!like, count });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: いいねトグル
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.toggleGachaLike(session.user.id, id);
    const count = await db.getGachaLikeCount(id);

    return NextResponse.json({ ...result, count });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
