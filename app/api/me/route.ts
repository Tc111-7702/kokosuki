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
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: session.user.id, name: session.user.name } });
  } catch {
    return NextResponse.json({ user: null });
  }
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
