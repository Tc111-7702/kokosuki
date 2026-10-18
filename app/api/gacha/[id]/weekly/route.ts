import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// GET: 今週発売の情報（通知購読中か・楽しみの声を投稿したユーザー数）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    const info = await db.getWeeklyInfo(id, session?.user?.id);
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
