import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET() {
  const now = new Date();
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
  const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);

  const toItem = ({ _count, ...g }: Awaited<ReturnType<typeof db.findComingSoonGachas>>[number]) =>
    ({ ...g, likeCount: _count.gachaLikes });

  // ① 今日〜1週間後
  const upcoming = await db.findComingSoonGachas({ releaseDate: { gte: now, lte: nextWeek } }, 10);
  let gachas = upcoming.map(toItem);

  // ② 足りなければ過去1週間でかさ増し
  if (gachas.length < 10) {
    const existingIds = gachas.map(g => g.id);
    const recent = await db.findComingSoonGachas(
      { releaseDate: { gte: lastWeek, lt: now }, id: { notIn: existingIds } },
      10 - gachas.length,
    );
    gachas = [...gachas, ...recent.map(toItem)];
  }

  // ③ まだ足りなければ coming_soon ステータスのガチャで補完
  if (gachas.length < 10) {
    const existingIds = gachas.map(g => g.id);
    const comingSoon = await db.findComingSoonGachas(
      { status: 'coming_soon', id: { notIn: existingIds } },
      10 - gachas.length,
    );
    gachas = [...gachas, ...comingSoon.map(toItem)];
  }

  // ④ それでも足りなければ on_sale から補完
  if (gachas.length < 10) {
    const existingIds = gachas.map(g => g.id);
    const onSale = await db.findComingSoonGachas(
      { status: 'on_sale', id: { notIn: existingIds } },
      10 - gachas.length,
    );
    gachas = [...gachas, ...onSale.map(toItem)];
  }

  return NextResponse.json({ gachas });
}
