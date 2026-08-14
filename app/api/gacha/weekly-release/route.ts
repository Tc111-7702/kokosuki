import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// ホーム「今週発売」セクション用。
// 管理者が選択した掲載枠(section='weekly')を sortOrder 順で返す。
// 手動選択がそのまま反映される（0件なら空 → セクション非表示）。フォールバックはしない。
// お気に入り済みは非表示。

export const dynamic = 'force-dynamic';

const SECTION = 'weekly';

type CardRow = Awaited<ReturnType<typeof db.getHomeFeaturedGachas>>[number];
const toItem = (g: CardRow) => ({
  id: g.id,
  seriesName: g.seriesName,
  ipName: g.ipName,
  imageUrl: g.imageUrl,
  gradientFrom: g.gradientFrom,
  gradientTo: g.gradientTo,
  likeCount: g._count.gachaLikes,
  status: g.status,
  releaseDate: g.releaseDate,
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const liked = new Set(session?.user?.id ? await db.getLikedGachaIds(session.user.id) : []);

  const featured = await db.getHomeFeaturedGachas(SECTION);
  const gachas = featured.filter((g) => !liked.has(g.id)).map(toItem);
  return NextResponse.json({ gachas });
}
