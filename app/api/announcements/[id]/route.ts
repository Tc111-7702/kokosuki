import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/announcements/[id] — 公開済みお知らせ1件
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const announcement = await db.getPublishedAnnouncementByIdForUser(id, session.user.id);
    if (!announcement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ announcement });
  } catch (e) {
    console.error('[announcements GET id]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
