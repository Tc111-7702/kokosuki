import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// DELETE: 楽しみの声を削除（本人のみ）。戻り値に更新後の投稿ユーザー数。
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; voiceId: string }> }) {
  try {
    const { voiceId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await db.deleteWeeklyVoice(voiceId, session.user.id);
    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
