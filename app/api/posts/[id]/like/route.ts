import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyLike } from '@/lib/notifications';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { id: postId } = await params;

    const { liked, likeCount } = await db.togglePostLike(userId, postId);
    if (liked) {
      await notifyLike('post', postId, userId);
    }

    return NextResponse.json({ liked, likeCount });
  } catch (e) {
    console.error('[like]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
