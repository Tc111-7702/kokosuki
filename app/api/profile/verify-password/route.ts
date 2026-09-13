import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/profile/verify-password — 現在のパスワードを照合 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 400 });
  }
}
