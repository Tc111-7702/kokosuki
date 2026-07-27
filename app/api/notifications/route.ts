import { NextResponse } from 'next/server';
import { getNotificationsByUserId } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/notifications — 自分の通知一覧（新しい順・最大50件）
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await getNotificationsByUserId(session.user.id);
    return NextResponse.json({ notifications });
  } catch (e) {
    console.error('[notifications GET]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
