import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as db from '@/lib/db';

// POST /api/posts  — 通常投稿を作成
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { gachaId, spotId, result, itemName, imageUrl, memo } = body as {
    gachaId: string;
    spotId: string;
    result: string;
    itemName?: string;
    imageUrl?: string;
    memo?: string;
  };

  if (!gachaId || !spotId || !result) {
    return NextResponse.json({ error: 'gachaId, spotId, result は必須です' }, { status: 400 });
  }

  // Machine を取得または作成（spotId + gachaId で unique）
  const machine = await db.upsertMachine(spotId, gachaId);

  const post = await db.createPost({
    userId:   session.user.id,
    machineId: machine.id,
    spotId,
    gachaId,
    result,
    itemName: itemName ?? null,
    imageUrl: imageUrl ?? null,
    memo:     memo ?? null,
  });

  return NextResponse.json({ post }, { status: 201 });
}
