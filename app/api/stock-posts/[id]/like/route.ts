import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyLike } from '@/lib/notifications';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: stockPostId } = await params;
  const userId = session.user.id;

  const existing = await prisma.stockPostLike.findUnique({ where: { userId_stockPostId: { userId, stockPostId } } });
  if (existing) {
    await prisma.stockPostLike.delete({ where: { userId_stockPostId: { userId, stockPostId } } });
    return NextResponse.json({ liked: false });
  } else {
    await prisma.stockPostLike.create({ data: { userId, stockPostId } });
    await notifyLike('stockPost', stockPostId, userId);
    return NextResponse.json({ liked: true });
  }
}
