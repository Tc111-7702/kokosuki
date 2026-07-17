import { NextResponse } from 'next/server';
import { markNotificationsAsRead } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// PATCH /api/notifications/read — 全件既読化（通知一覧を開いたときに呼ぶ）
export async function PATCH() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await markNotificationsAsRead(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[notifications read PATCH]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
