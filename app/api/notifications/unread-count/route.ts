import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/notifications/unread-count — 未読数（ベルのバッジ用・個人通知＋お知らせ）
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const [personal, everyone] = await Promise.all([
      db.getUnreadNotificationCount(userId),
      db.getUnreadAnnouncementCount(userId),
    ]);
    return NextResponse.json({ count: personal + everyone });
  } catch (e) {
    console.error('[notifications unread-count]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
