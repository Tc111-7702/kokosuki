import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/announcements — 公開済みお知らせ一覧（新しい順）
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcements = await db.listPublishedAnnouncements();
    return NextResponse.json({ announcements });
  } catch (e) {
    console.error('[announcements GET]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
