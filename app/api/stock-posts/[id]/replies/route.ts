import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyReply } from '@/lib/notifications';

const USER_SELECT = { select: { id: true, name: true, image: true } };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: stockPostId } = await params;
  const replies = await prisma.stockPostReply.findMany({
    where: { stockPostId },
    orderBy: { createdAt: 'asc' },
    include: { user: USER_SELECT },
  });
  return NextResponse.json({ replies });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: stockPostId } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const reply = await prisma.stockPostReply.create({
    data: { stockPostId, userId: session.user.id, text: text.trim() },
    include: { user: USER_SELECT },
  });

  await notifyReply('stockPost', stockPostId, session.user.id, text.trim());

  return NextResponse.json({ reply }, { status: 201 });
}
