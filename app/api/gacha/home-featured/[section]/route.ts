import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

// ホームの掲載枠セクション用。admin が手動設定した掲載ガチャを sortOrder 順で返す。
//   section: 'weekly'（今週発売） | 'reissue'（再販・また引ける）
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
    const gachas = await db.getHomeFeaturedGachas(section);
    return NextResponse.json({ gachas });
  } catch (e) {
    console.error('[/api/gacha/home-featured]', e);
    return NextResponse.json({ gachas: [] }, { status: 500 });
  }
}
