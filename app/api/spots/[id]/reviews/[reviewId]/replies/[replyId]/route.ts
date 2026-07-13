import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// DELETE /api/spots/[id]/reviews/[reviewId]/replies/[replyId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; reviewId: string; replyId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { reviewId, replyId } = await params;

    const reply = await prisma.spotReviewReply.findUnique({ where: { id: replyId } });
    if (!reply) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (reply.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.spotReviewReply.delete({ where: { id: replyId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[review reply DELETE]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
