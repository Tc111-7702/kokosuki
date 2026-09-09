import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// ログイン中ユーザーがいいね済みのガチャIDを返す（カードのハート初期状態に使う）。
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ ids: [] });
  const ids = await db.getLikedGachaIds(session.user.id);
  return NextResponse.json({ ids });
}
