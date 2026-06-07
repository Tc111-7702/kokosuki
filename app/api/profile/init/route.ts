import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

function randomHandle(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `user_${rand}`;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { favoriteIps = [], likedGachaIds = [], handle } = await req.json();

  // ハンドルが空の場合はランダム生成、指定ありの場合は重複チェック
  let resolvedHandle = handle?.trim() || null;

  if (resolvedHandle) {
    const existing = await prisma.userProfile.findUnique({ where: { handle: resolvedHandle } });
    if (existing) {
      return NextResponse.json({ error: 'このIDはすでに使われています' }, { status: 409 });
    }
  } else {
    // 重複しないランダムハンドルを生成
    let candidate: string;
    do {
      candidate = randomHandle();
      const exists = await prisma.userProfile.findUnique({ where: { handle: candidate } });
      if (!exists) { resolvedHandle = candidate; break; }
    } while (true);
  }

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: { handle: resolvedHandle, favoriteIps },
    create: { userId: session.user.id, handle: resolvedHandle, favoriteIps },
  });

  // likedGachaIds を GachaLike に保存
  if (likedGachaIds.length > 0) {
    await prisma.gachaLike.createMany({
      data: likedGachaIds.map((gachaId: string) => ({
        userId: session.user.id,
        gachaId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, handle: resolvedHandle });
}
