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
    const myLikes = await prisma.gachaLike.findMany({
      where: { userId },
      select: { gacha: { select: { ipName: true } } },
    });
    const myIpNames = [...new Set(myLikes.map((f) => f.gacha.ipName))];

    // 同じ ipName を持つガチャの ID
    const matchingGachaIds = myIpNames.length > 0
      ? (await prisma.gacha.findMany({
          where: { ipName: { in: myIpNames } },
          select: { id: true },
        })).map((g) => g.id)
      : [];

    // 同じ IP をお気に入りにしているユーザー（自分以外）
    const sharedRows = matchingGachaIds.length > 0
      ? await prisma.gachaLike.findMany({
          where: {
            gachaId: { in: matchingGachaIds },
            userId: { not: userId },
          },
          select: { userId: true },
          distinct: ['userId'],
        })
      : [];

    const candidateIds = sharedRows.map((r) => r.userId);
    if (candidateIds.length === 0) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { handle: true, avatarUrl: true, bio: true } },
      },
      take: 5,
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.profile?.handle ?? null,
        image: u.profile?.avatarUrl ?? u.image ?? null,
        bio: u.profile?.bio ?? null,
      })),
    });
  } catch (e) {
    console.error('[recommended-users]', e);
    return NextResponse.json({ users: [] });
  }
}
