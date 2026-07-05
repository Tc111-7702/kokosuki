import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const USER_SELECT = { select: { id: true, name: true, image: true } } as const;

// GET /api/posts/[id]/replies
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const replies = await prisma.postReply.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: { user: USER_SELECT },
    });
    return NextResponse.json({ replies });
  } catch (e) {
    console.error('[replies GET]', e);
    return NextResponse.json({ replies: [] }, { status: 500 });
  }
}

// POST /api/posts/[id]/replies
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { id: postId } = await params;

    const body = await request.json();
    const text: string = (body.text ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const reply = await prisma.postReply.create({
      data: { postId, userId, text, parentId: null },
      include: { user: USER_SELECT },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (e) {
    console.error('[replies POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
