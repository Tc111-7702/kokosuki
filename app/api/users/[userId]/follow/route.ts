import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const followerId  = session.user.id;
  const { userId: followingId } = await params;

  if (followerId === followingId) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  try {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      // アンフォロー
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      return NextResponse.json({ following: false });
    } else {
      // フォロー
      await prisma.follow.create({ data: { followerId, followingId } });
      return NextResponse.json({ following: true });
    }
  } catch (e) {
    console.error('[follow]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
