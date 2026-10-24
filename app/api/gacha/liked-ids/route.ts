import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// ログイン中ユーザーがいいね済みのガチャIDを返す（カードのハート初期状態に使う）。
// ?onSale=1 で発売中(on_sale)のガチャのみに絞る（お気に入りのみフィルター用）。
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ ids: [] });
  const onSaleOnly = new URL(request.url).searchParams.get('onSale') === '1';
  const ids = await db.getLikedGachaIds(session.user.id, onSaleOnly);
  return NextResponse.json({ ids });
}
