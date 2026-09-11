import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/notifications/tab-unread-counts — 通知ページ各タブの未読数
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const [everyone, personal] = await Promise.all([
      db.getUnreadAnnouncementCount(userId),
      db.getUnreadNotificationCount(userId),
    ]);

    return NextResponse.json({ everyone, personal });
  } catch (e) {
    console.error('[notifications tab-unread-counts]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
