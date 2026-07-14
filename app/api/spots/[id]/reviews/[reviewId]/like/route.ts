import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyLike } from '@/lib/notifications';

// POST /api/spots/[id]/reviews/[reviewId]/like
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { reviewId } = await params;

    const existing = await prisma.spotReviewLike.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });
    if (existing) {
      await prisma.spotReviewLike.delete({ where: { userId_reviewId: { userId, reviewId } } });
    } else {
      await prisma.spotReviewLike.create({ data: { userId, reviewId } });
      await notifyLike('spotReview', reviewId, userId);
    }
    const count = await prisma.spotReviewLike.count({ where: { reviewId } });
    return NextResponse.json({ liked: !existing, count });
  } catch (e) {
    console.error('[review like]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
