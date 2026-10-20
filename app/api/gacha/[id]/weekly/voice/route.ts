import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// GET: 楽しみの声一覧（新しい順）＋ 現在ユーザーID（自分の投稿に削除ボタンを出すため）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    const voices = await db.getWeeklyVoices(id);
    return NextResponse.json({ voices, currentUserId: session?.user?.id ?? null });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: 楽しみの声を投稿（要ログイン・1ユーザー何回でも可）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const result = await db.addWeeklyVoice(
      id,
      { id: session.user.id, name: session.user.name ?? '', image: session.user.image ?? null },
      text,
    );
    if (!result) return NextResponse.json({ error: 'not a weekly pickup' }, { status: 404 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
