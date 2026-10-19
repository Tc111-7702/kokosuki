import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { isSignupHandleFormatValid } from '@/lib/signupHandle';

// GET /api/profile/handle-available?handle=xxx
// ユーザーID（handle）の形式チェックと空き確認。サインアップ／プロフィール設定の入力中チェックに使う。
// ログイン中は自分の handle を「空き」扱いする。
// { available: boolean, reason?: 'invalid' | 'error' } を返す。
export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get('handle')?.trim().toLowerCase() ?? '';
  if (!isSignupHandleFormatValid(handle)) {
    return NextResponse.json({ available: false, reason: 'invalid' }, { status: 400 });
  }
  try {
    const existing = await db.findProfileByHandle(handle);
    if (!existing) {
      return NextResponse.json({ available: true });
    }
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.id && existing.userId === session.user.id) {
      return NextResponse.json({ available: true });
    }
    return NextResponse.json({ available: false });
  } catch {
    return NextResponse.json({ available: false, reason: 'error' }, { status: 500 });
  }
}
