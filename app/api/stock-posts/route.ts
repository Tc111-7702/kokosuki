import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

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
  const machine = await prisma.machine.upsert({
    where:  { spotId_gachaId: { spotId, gachaId } },
    create: { spotId, gachaId, stockStatus },
    update: { stockStatus },
  });

  const stockPost = await prisma.stockPost.create({
    data: {
      userId:      session.user.id,
      machineId:   machine.id,
      spotId,
      gachaId,
      stockStatus,
    },
  });

  return NextResponse.json({ stockPost }, { status: 201 });
}
