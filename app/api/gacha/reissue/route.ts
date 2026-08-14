import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// ホーム「再販・また引ける！」セクション用。
// 管理者が選択した掲載枠(section='reissue')を sortOrder 順で返す。
// 未設定ならいいね数上位10件（店舗にある「再販」ガチャ）でフォールバック。
// お気に入り済みは非表示。

export const dynamic = 'force-dynamic';

const SECTION = 'reissue';

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
  const source = featured.length > 0 ? featured : await db.findReissueTop(10);
  const gachas = source.filter((g) => !liked.has(g.id)).map(toItem);
  return NextResponse.json({ gachas });
}
