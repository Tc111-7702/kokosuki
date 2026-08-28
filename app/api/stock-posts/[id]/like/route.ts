import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyLike, removeLikeNotification } from '@/lib/notifications';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: stockPostId } = await params;
  const userId = session.user.id;

  const { liked, likeCount } = await db.toggleStockPostLike(userId, stockPostId);
  if (liked) {
    await notifyLike('stockPost', stockPostId, userId);
  } else {
    await removeLikeNotification('stockPost', stockPostId, userId);
  }

  return NextResponse.json({ liked, likeCount });
}
