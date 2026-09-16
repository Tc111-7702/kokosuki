import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { headers } from 'next/headers';
import { appendKokosukiSessionClear } from '@/lib/kokosukiSignOut';
import {
  quickLoginCookieName,
  quickLoginCookieOptions,
} from '@/lib/quickLoginCookie';
import { revokeQuickLoginTokensForUser } from '@/lib/quickLoginToken';
import { isSavedLoginProviderEmail } from '@/lib/savedLoginAccounts';

export async function GET() {
  const h = await headers();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const session = await auth.api.getSession({ headers: h });
      if (!session?.user) return NextResponse.json({ user: null });
      return NextResponse.json({ user: { id: session.user.id, name: session.user.name } });
    } catch (e) {
      // 一時的な DB 接続エラーでセッション判定に失敗した場合は少し待って再試行。
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      // 恒久的に失敗: ここで 200 {user:null} を返すと SessionGuard 等が「未ログイン」と
      // 誤認して追放（signOut→/login）してしまう。一時エラーと分かるよう 503 を返し、
      // 呼び出し側にはリトライ/無視させる。
      console.error('[me GET] session unavailable:', e instanceof Error ? e.message : e);
      return NextResponse.json({ user: null, error: 'session_unavailable' }, { status: 503 });
    }
  }
  return NextResponse.json({ user: null, error: 'session_unavailable' }, { status: 503 });
}

// DELETE /api/me — 退会（関連データはスキーマのonDelete: Cascadeで連鎖削除）
export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email?.trim().toLowerCase() ?? '';

    await revokeQuickLoginTokensForUser(userId);
    await db.deleteUser(userId);

    const h = await headers();
    const res = NextResponse.json({ ok: true });
    await appendKokosukiSessionClear(res, h);
    if (userEmail && isSavedLoginProviderEmail(userEmail)) {
      res.cookies.set(quickLoginCookieName(userEmail), '', quickLoginCookieOptions(0));
    }
    return res;
  } catch (e) {
    console.error('[me DELETE]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
