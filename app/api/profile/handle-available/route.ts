import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { isSignupHandleFormatValid } from '@/lib/signupHandle';

// GET /api/profile/handle-available?handle=xxx
// ユーザーID（handle）の形式チェックと空き確認。サインアップ前の pre-flight／入力中チェックに使う。
// { available: boolean, reason?: 'invalid' } を返す。
export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get('handle')?.trim().toLowerCase() ?? '';
  if (!isSignupHandleFormatValid(handle)) {
    return NextResponse.json({ available: false, reason: 'invalid' }, { status: 400 });
  }
  try {
    const existing = await db.findProfileByHandle(handle);
    return NextResponse.json({ available: !existing });
  } catch {
    return NextResponse.json({ available: false, reason: 'error' }, { status: 500 });
  }
}
