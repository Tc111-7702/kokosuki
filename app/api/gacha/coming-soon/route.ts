import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const now = new Date();
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
  const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);

  // ① 今日〜1週間後
  const upcoming = await prisma.gacha.findMany({
    where: { isOnSale: true, releaseDate: { gte: now, lte: nextWeek } },
    orderBy: { gachaLikes: { _count: 'desc' } },
    take: 10,
    select: {
      id: true, seriesName: true, ipName: true,
      imageUrl: true, gradientFrom: true, gradientTo: true,
      status: true, releaseDate: true,
      _count: { select: { gachaLikes: true } },
    },
  });

  let gachas = upcoming.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }));

  // ② 足りなければ過去1週間でかさ増し
  if (gachas.length < 10) {
    const existingIds = new Set(gachas.map(g => g.id));
    const recent = await prisma.gacha.findMany({
      where: {
        isOnSale: true,
        releaseDate: { gte: lastWeek, lt: now },
        id: { notIn: [...existingIds] },
      },
      orderBy: { gachaLikes: { _count: 'desc' } },
      take: 10 - gachas.length,
      select: {
        id: true, seriesName: true, ipName: true,
        imageUrl: true, gradientFrom: true, gradientTo: true,
        status: true, releaseDate: true,
        _count: { select: { gachaLikes: true } },
      },
    });
    gachas = [...gachas, ...recent.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }))];
  }

  // ③ まだ足りなければ coming_soon ステータスのガチャで補完
  if (gachas.length < 10) {
    const existingIds = new Set(gachas.map(g => g.id));
    const comingSoon = await prisma.gacha.findMany({
      where: {
        isOnSale: true,
        status: 'coming_soon',
        id: { notIn: [...existingIds] },
      },
      orderBy: { gachaLikes: { _count: 'desc' } },
      take: 10 - gachas.length,
      select: {
        id: true, seriesName: true, ipName: true,
        imageUrl: true, gradientFrom: true, gradientTo: true,
        status: true, releaseDate: true,
        _count: { select: { gachaLikes: true } },
      },
    });
    gachas = [...gachas, ...comingSoon.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }))];
  }

  // ④ それでも足りなければ on_sale から補完
  if (gachas.length < 10) {
    const existingIds = new Set(gachas.map(g => g.id));
    const onSale = await prisma.gacha.findMany({
      where: {
        isOnSale: true,
        status: 'on_sale',
        id: { notIn: [...existingIds] },
      },
      orderBy: { gachaLikes: { _count: 'desc' } },
      take: 10 - gachas.length,
      select: {
        id: true, seriesName: true, ipName: true,
        imageUrl: true, gradientFrom: true, gradientTo: true,
        status: true, releaseDate: true,
        _count: { select: { gachaLikes: true } },
      },
    });
    gachas = [...gachas, ...onSale.map(({ _count, ...g }) => ({ ...g, likeCount: _count.gachaLikes }))];
  }

  return NextResponse.json({ gachas });
}
