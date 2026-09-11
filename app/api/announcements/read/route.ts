import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';

// PATCH /api/announcements/read — 公開済みお知らせをすべて既読化
export async function PATCH() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.markPublishedAnnouncementsAsRead(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[announcements read PATCH]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
