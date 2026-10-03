import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  checkAndResetRateLimit,
  clearRateLimit,
  getRateLimitStatus,
  registerRateLimitFailure,
} from '@/lib/rateLimit';
import {
  VERIFY_PASSWORD_RATE_LIMIT,
  VERIFY_PASSWORD_RATE_LIMIT_ERROR,
  verifyPasswordRateKey,
} from '@/lib/verifyPasswordRateLimit';

export const dynamic = 'force-dynamic';

/** GET /api/profile/verify-password — マウント時のロック状態確認（期限切れはリセット） */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ locked: false });
  const { locked } = await checkAndResetRateLimit(verifyPasswordRateKey(session.user.id));
  return NextResponse.json({ locked });
}

/** POST /api/profile/verify-password — 現在のパスワードを照合（5回誤入力で15分ロック） */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = verifyPasswordRateKey(session.user.id);
  if ((await getRateLimitStatus(key)).locked) {
    return NextResponse.json({ error: VERIFY_PASSWORD_RATE_LIMIT_ERROR, locked: true }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 400 });
  }

  try {
    await auth.api.verifyPassword({
      body: { password },
      headers: await headers(),
    });
    // 照合成功 → カウントをリセット。
    await clearRateLimit(key);
    return NextResponse.json({ ok: true });
  } catch {
    const rl = await registerRateLimitFailure(key, VERIFY_PASSWORD_RATE_LIMIT);
    if (rl.locked) {
      return NextResponse.json({ error: VERIFY_PASSWORD_RATE_LIMIT_ERROR, locked: true }, { status: 429 });
    }
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 400 });
  }
}
