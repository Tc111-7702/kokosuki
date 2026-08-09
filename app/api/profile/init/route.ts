import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
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

  const { likedGachaIds = [], handle, avatarUrl } = await req.json();

  let resolvedHandle = handle?.trim() || null;

  if (resolvedHandle) {
    const existing = await db.findProfileByHandle(resolvedHandle);
    if (existing) {
      return NextResponse.json({ error: 'このIDはすでに使われています' }, { status: 409 });
    }
  } else {
    let candidate: string;
    do {
      candidate = randomHandle();
      const exists = await db.findProfileByHandle(candidate);
      if (!exists) { resolvedHandle = candidate; break; }
    } while (true);
  }

  await db.upsertProfile(session.user.id, resolvedHandle);

  // アイコン（任意）: プロフィール編集と同様に avatarUrl と User.image を同期
  if (typeof avatarUrl === 'string' && avatarUrl) {
    await db.upsertUserProfile(session.user.id, { avatarUrl });
    await db.updateUserImage(session.user.id, avatarUrl);
  }

  if (likedGachaIds.length > 0) {
    await db.createGachaLikes(session.user.id, likedGachaIds);
  }

  return NextResponse.json({ ok: true, handle: resolvedHandle });
}
