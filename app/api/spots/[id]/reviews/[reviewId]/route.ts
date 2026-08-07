import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// PUT /api/spots/[id]/reviews/[reviewId]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { reviewId } = await params;

    const review = await db.getSpotReviewById(reviewId);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (review.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const text: string = (body.text ?? '').trim();
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const updated = await db.updateSpotReview(reviewId, text);
    return NextResponse.json({ review: updated });
  } catch (e) {
    console.error('[review PUT]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/spots/[id]/reviews/[reviewId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { reviewId } = await params;

    const review = await db.getSpotReviewById(reviewId);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (review.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.deleteSpotReview(reviewId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[review DELETE]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
