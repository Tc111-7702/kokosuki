import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/mypage/stock-posts — 自分の在庫報告一覧（新しい順・最大50件）
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stockPosts = await prisma.stockPost.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        gacha: { select: { seriesName: true, imageUrl: true, gradientFrom: true, gradientTo: true } },
        spot:  { select: { name: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
    return NextResponse.json({ stockPosts });
  } catch (e) {
    console.error('[mypage stock-posts]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
