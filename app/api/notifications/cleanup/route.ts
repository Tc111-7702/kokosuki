import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as db from '@/lib/db';

// 保持期間: 既読かつ作成から30日経過した通知を削除（24hは短すぎるため1ヶ月に緩和）
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// クライアント駆動の自動クリーンアップ。ログイン中ユーザーからのみ実行可（無認可の穴を塞ぐ）。
// 呼び出し頻度はクライアント側で localStorage により 24h に1回へスロットルする。
// 冪等（read かつ30日経過を削除するだけ）なので、複数ユーザーから呼ばれても安全。
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const { count } = await db.deleteReadNotificationsBefore(cutoff);
  return NextResponse.json({ ok: true, deleted: count });
}
