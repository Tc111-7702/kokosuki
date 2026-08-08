import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET /api/users/[userId]/favorites — 指定ユーザーのお気に入りガチャ一覧（公開）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const rows = await db.getUserFavorites(userId);
    return NextResponse.json({ gachas: rows.map((r) => r.gacha) });
  } catch (e) {
    console.error('[users favorites]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
