import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/gacha/by-ids?ids=a,b — 指定IDのガチャと、所属IPの選択数・発売中総数だけ返す */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  try {
    const data = await db.getFilterSelection(ids);
    return NextResponse.json(data);
  } catch (e) {
    console.error('[/api/gacha/by-ids]', e);
    return NextResponse.json({ rows: [], items: [] }, { status: 500 });
  }
}
