import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
    } else {
      await prisma.like.create({ data: { userId, postId } });
      await notifyLike('post', postId, userId);
    }

    const likeCount = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ liked: !existing, likeCount });
  } catch (e) {
    console.error('[like]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
