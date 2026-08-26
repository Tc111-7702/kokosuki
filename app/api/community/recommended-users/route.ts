import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ users: [] }, { status: 401 });
    const userId = session.user.id;

    // 自分のお気に入りガチャの ipName 一覧
    const myIpNames = await db.getUserLikedIpNames(userId);

    // 同じ ipName を持つガチャの ID
    const matchingGachaIds = await db.getGachaIdsByIpNames(myIpNames);

    // 同じ IP をお気に入りにしているユーザー（自分以外）
    const candidateIds = await db.getUserIdsWhoLikedGachas(matchingGachaIds, userId);
    if (candidateIds.length === 0) return NextResponse.json({ users: [] });

    const users = await db.getUsersByIds(candidateIds, 5);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.profile?.handle ?? null,
        image: u.image ?? null,
        bio: u.profile?.bio ?? null,
      })),
    });
  } catch (e) {
    console.error('[recommended-users]', e);
    return NextResponse.json({ users: [] });
  }
}
