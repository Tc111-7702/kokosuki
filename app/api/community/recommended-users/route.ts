import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ users: [] }, { status: 401 });
    const userId = session.user.id;

    // 自分のお気に入りガチャの ipName 一覧
    const myFavs = await prisma.userFavoriteGacha.findMany({
      where: { userId },
      select: { gacha: { select: { ipName: true } } },
    });
    const myIpNames = [...new Set(myFavs.map((f) => f.gacha.ipName))];

    // 同じ ipName を持つガチャの ID
    const matchingGachaIds = myIpNames.length > 0
      ? (await prisma.gacha.findMany({
          where: { ipName: { in: myIpNames } },
          select: { id: true },
        })).map((g) => g.id)
      : [];

    // 自分がフォロー済みのユーザー ID
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const excludeIds = [userId, ...following.map((f) => f.followingId)];

    // 同じ IP をお気に入りにしているユーザー（distinct）
    const sharedRows = matchingGachaIds.length > 0
      ? await prisma.userFavoriteGacha.findMany({
          where: {
            gachaId: { in: matchingGachaIds },
            userId: { notIn: excludeIds },
          },
          select: { userId: true },
          distinct: ['userId'],
        })
      : [];

    const candidateIds = sharedRows.map((r) => r.userId);

    if (candidateIds.length === 0) return NextResponse.json({ users: [] });

    // フォロワー数降順で top 5
    const users = await prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { handle: true, avatarUrl: true, bio: true } },
        _count: { select: { followers: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: 5,
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.profile?.handle ?? null,
        image: u.profile?.avatarUrl ?? u.image ?? null,
        bio: u.profile?.bio ?? null,
        followerCount: u._count.followers,
      })),
    });
  } catch (e) {
    console.error('[recommended-users]', e);
    return NextResponse.json({ users: [] });
  }
}
