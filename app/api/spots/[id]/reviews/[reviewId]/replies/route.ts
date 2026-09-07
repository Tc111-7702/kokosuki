import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyReply, notifyMention } from '@/lib/notifications';

// POST /api/spots/[id]/reviews/[reviewId]/replies
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { reviewId } = await params;

    const body = await request.json();
    const text: string = (body.text ?? '').trim();
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const reply = await db.createSpotReviewReplyWithUser(reviewId, userId, text);

    await notifyReply('spotReview', reviewId, userId, text);
    await notifyMention('spotReview', reviewId, userId, text);

    return NextResponse.json({ reply }, { status: 201 });
  } catch (e) {
    console.error('[review reply POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
