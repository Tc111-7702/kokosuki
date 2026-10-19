import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ホームのピックアップ枠セクション用。
//   section: 'weekly'（今週発売＝admin が手動設定した WeeklyPickup を sortOrder 順）
//          | 'reissue'（再販・また引ける＝名前に「再販」を含む発売中ガチャをいいね順に動的生成）
// どちらもログインユーザーが既にいいね済みのガチャは表示しない（未ログインは除外なし）。
const SECTIONS = ['weekly', 'reissue'] as const;
type Section = (typeof SECTIONS)[number];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  if (!SECTIONS.includes(section as Section)) {
    return NextResponse.json({ error: 'invalid section' }, { status: 400 });
  }
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const excludeIds = session?.user?.id ? await db.getLikedGachaIds(session.user.id) : [];
    const gachas = section === 'reissue'
      ? await db.getReissueGachas(10, excludeIds)
      : await db.getPickupGachas(section, excludeIds);
    return NextResponse.json({ gachas });
  } catch (e) {
    console.error('[/api/gacha/home-pickup]', e);
    return NextResponse.json({ gachas: [] }, { status: 500 });
  }
}
