import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: session.user.id, name: session.user.name } });
  } catch {
    return NextResponse.json({ user: null });
  }
}

// DELETE /api/me — 退会（関連データはスキーマのonDelete: Cascadeで連鎖削除）
export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.deleteUser(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[me DELETE]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
