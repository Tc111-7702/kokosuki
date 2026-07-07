import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { replyId } = await params;
  const reply = await prisma.stockPostReply.findUnique({ where: { id: replyId } });
  if (!reply) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (reply.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.stockPostReply.delete({ where: { id: replyId } });
  return NextResponse.json({ ok: true });
}
