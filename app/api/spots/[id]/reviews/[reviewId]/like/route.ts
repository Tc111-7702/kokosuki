import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
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

    const { liked, count } = await db.toggleSpotReviewLike(userId, reviewId);
    if (liked) {
      await notifyLike('spotReview', reviewId, userId);
    }
    return NextResponse.json({ liked, count });
  } catch (e) {
    console.error('[review like]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
