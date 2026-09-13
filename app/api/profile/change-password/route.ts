import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { validatePasswordPolicy } from '@/lib/passwordPolicy';

export const dynamic = 'force-dynamic';

/** POST /api/profile/change-password — ログイン中のユーザーがパスワードを変更 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword) {
    return NextResponse.json({ error: '現在のパスワードが違います' }, { status: 400 });
  }

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: await headers(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[profile change-password POST]', e);
    return NextResponse.json({ error: '現在のパスワードが違います' }, { status: 400 });
  }
}
