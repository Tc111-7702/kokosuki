import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/users/[userId]/stock-posts — 指定ユーザーの在庫報告一覧（公開・カード用）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    const viewerId = session?.user?.id ?? null;

    const rows = await db.getUserStockPosts(userId);

    let likedSet = new Set<string>();
    if (viewerId && rows.length > 0) {
      const liked = await db.getStockPostLikedIds(viewerId, rows.map((p) => p.id));
      likedSet = new Set(liked.map((l) => l.stockPostId));
    }

    const stockPosts = rows.map((p) => ({ ...p, postType: 'stock' as const, likedByMe: likedSet.has(p.id) }));
    return NextResponse.json({ stockPosts });
  } catch (e) {
    console.error('[users stock-posts]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
