import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET /api/users/[userId]/summary — 公開プロフィール＋統計（誰でも閲覧可）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const summary = await db.getPublicUserSummary(userId);
    if (!summary) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(summary);
  } catch (e) {
    console.error('[users summary]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
