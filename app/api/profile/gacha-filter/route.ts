import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/profile/gacha-filter — マップ/店舗詳細のガチャフィルター（User.gachaFilterIds）を取得 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gachaIds = await db.getGachaFilterIds(session.user.id);
  return NextResponse.json({ gachaIds });
}

/** PUT /api/profile/gacha-filter — フィルターを選択集合で置き換える（フィルターUIの「適用」） */
export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const gachaIds = Array.isArray(body?.gachaIds)
    ? body.gachaIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : null;
  if (!gachaIds) {
    return NextResponse.json({ error: 'gachaIds が不正です' }, { status: 400 });
  }

  await db.setGachaFilterIds(session.user.id, gachaIds);
  return NextResponse.json({ ok: true, gachaIds: [...new Set(gachaIds)] });
}
