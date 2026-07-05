import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const INCLUDE = {
  user:  { select: { id: true, name: true, image: true } },
  spot:  { select: { id: true, name: true } },
  gacha: { select: { id: true, ipName: true, seriesName: true, gradientFrom: true, gradientTo: true } },
  _count: { select: { likes: true, replies: true } },
} as const;

const ORDER_BY = { likes: { _count: 'desc' as const } };

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ posts: [], nextSkip: null }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const type  = searchParams.get('type')  ?? 'recommended';
    const phase = searchParams.get('phase') ?? 'favorite';
    const skip  = parseInt(searchParams.get('skip') ?? '0', 10);
    const limit = 20;

    let posts;

    if (type === 'recommended') {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { favoriteIps: true },
      });
      const favoriteIps: string[] = profile?.favoriteIps ?? [];

      if (phase === 'favorite' && favoriteIps.length > 0) {
        posts = await prisma.post.findMany({
          where: { isPublic: true, gacha: { ipName: { in: favoriteIps } } },
          orderBy: ORDER_BY,
          skip,
          take: limit,
          include: INCLUDE,
        });
      } else {
        const notInWhere = favoriteIps.length > 0
          ? { gacha: { ipName: { notIn: favoriteIps } } }
          : {};
        posts = await prisma.post.findMany({
          where: { isPublic: true, ...notInWhere },
          orderBy: ORDER_BY,
          skip,
          take: limit,
          include: INCLUDE,
        });
      }
    } else {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const userIds = [userId, ...follows.map((f) => f.followingId)];

      posts = await prisma.post.findMany({
        where: { isPublic: true, userId: { in: userIds } },
        orderBy: ORDER_BY,
        skip,
        take: limit,
        include: INCLUDE,
      });
    }

    // 現ユーザーがいいねしているか
    const postIds = posts.map((p) => p.id);
    const myLikes = await prisma.like.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    const likedSet = new Set(myLikes.map((l) => l.postId));
    const postsWithLike = posts.map((p) => ({ ...p, likedByMe: likedSet.has(p.id) }));

    const nextSkip = posts.length === limit ? skip + limit : null;
    return NextResponse.json({ posts: postsWithLike, nextSkip });
  } catch (e) {
    console.error('[feed]', e);
    return NextResponse.json({ posts: [], nextSkip: null }, { status: 500 });
  }
}
