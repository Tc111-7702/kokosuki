import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as db from '@/lib/db';

// POST /api/machines/expire-stale-stock
// 最新の在庫報告が7日を過ぎた Machine の stockStatus を「不明(null)」に戻す（誤情報の自動失効）。
// Map / 店舗詳細ページを開いた時にクライアントから呼ばれる。呼び出し頻度はクライアント側で
// localStorage により 24h に1回へスロットルする（既読通知クリーンアップと同方式）。
// 冪等だが、無認可の穴を塞ぐためログイン中ユーザーからのみ実行可とする。
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const updated = await db.expireStaleMachineStock();
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('[expire-stale-stock]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
