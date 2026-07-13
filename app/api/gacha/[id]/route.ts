import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gacha = await db.getGachaById(id);
  if (!gacha) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 実際のDB件数で postCount / weeklyPulls を上書き
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [postCount, weeklyPulls] = await Promise.all([
    prisma.post.count({ where: { gachaId: id } }),
    prisma.post.count({ where: { gachaId: id, createdAt: { gte: weekStart } } }),
  ]);

  return NextResponse.json({ gacha: { ...gacha, postCount, weeklyPulls } });
}
