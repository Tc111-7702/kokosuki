import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { appendKokosukiSessionClear } from '@/lib/kokosukiSignOut';

/** POST /api/auth/clear-session — セッション Cookie をサーバー側で削除（signOut 失敗時のフォールバック） */
export async function POST() {
  const res = NextResponse.json({ success: true });
  await appendKokosukiSessionClear(res, await headers());
  return res;
}
