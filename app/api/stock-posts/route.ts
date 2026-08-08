import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { notifyFavoriteStock } from '@/lib/notifications';

// POST /api/stock-posts  — 在庫情報投稿を作成 & Machine.stockStatus を更新
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { gachaId, spotId, stockStatus } = body as {
    gachaId: string;
    spotId: string;
    stockStatus: string;
  };

  if (!gachaId || !spotId || !stockStatus) {
    return NextResponse.json({ error: 'gachaId, spotId, stockStatus は必須です' }, { status: 400 });
  }

  // Machine を取得または作成し、stockStatus を最新値に更新
  const machine = await db.upsertMachineWithStock(spotId, gachaId, stockStatus);

  const stockPost = await db.createStockPost({
    userId:      session.user.id,
    machineId:   machine.id,
    spotId,
    gachaId,
    stockStatus,
  });

  // このガチャをお気に入り登録しているユーザーへ通知（失敗しても投稿は成功扱い）
  await notifyFavoriteStock(stockPost);

  return NextResponse.json({ stockPost }, { status: 201 });
}
