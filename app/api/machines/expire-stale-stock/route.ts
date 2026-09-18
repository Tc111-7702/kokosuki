import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// POST /api/machines/expire-stale-stock
// 最新の在庫報告が7日を過ぎた Machine の stockStatus を「不明(null)」に戻す（誤情報の自動失効）。
// Map / 店舗詳細ページを開いた時にクライアントから呼ばれる。冪等な housekeeping なので認証は不要。
export async function POST() {
  try {
    const updated = await db.expireStaleMachineStock();
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('[expire-stale-stock]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
