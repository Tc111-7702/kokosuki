import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/notifications/unread-count — 未読数（ベルのバッジ用）
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });
    return NextResponse.json({ count });
  } catch (e) {
    console.error('[notifications unread-count]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
