import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// 発売通知の購読トグル。
// POST   = 通知ON（WeeklyReleaseNotify 追加＋いいねON）
// DELETE = 通知OFF（WeeklyReleaseNotify 削除＋いいねOFF）
async function handle(id: string, on: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await db.setWeeklyNotify(id, session.user.id, on);
  if (!result) {
    return NextResponse.json({ error: 'not a weekly pickup' }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await handle(id, true);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await handle(id, false);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
