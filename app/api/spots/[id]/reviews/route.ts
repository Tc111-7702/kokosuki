import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/spots/[id]/reviews?skip=0&take=3
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id ?? null;
    const { id: spotId } = await params;
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') ?? '0', 10);
    const take = parseInt(searchParams.get('take') ?? '3', 10);

    const [total, reviews] = await Promise.all([
      db.countSpotReviews(spotId),
      db.listSpotReviews(spotId, skip, take),
    ]);

    const items = reviews.map(({ likes, ...r }) => ({
      ...r,
      likedByMe: userId ? likes.some(l => l.userId === userId) : false,
    }));

    return NextResponse.json({ items, total });
  } catch (e) {
    console.error('[reviews GET]', e);
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}

// POST /api/spots/[id]/reviews
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { id: spotId } = await params;

    const body = await request.json();
    const text: string = (body.text ?? '').trim();
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const review = await db.createSpotReview(spotId, userId, text);

    return NextResponse.json({ review: { ...review, likedByMe: false } }, { status: 201 });
  } catch (e) {
    console.error('[reviews POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
