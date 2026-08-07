import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyReply } from '@/lib/notifications';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: stockPostId } = await params;
  const replies = await db.listStockPostReplies(stockPostId);
  return NextResponse.json({ replies });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: stockPostId } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const reply = await db.createStockPostReplyWithUser(stockPostId, session.user.id, text.trim());

  await notifyReply('stockPost', stockPostId, session.user.id, text.trim());

  return NextResponse.json({ reply }, { status: 201 });
}
