import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { validatePasswordPolicy } from '@/lib/passwordPolicy';

/** POST /api/profile/reset-password — token 付きパスワード再設定（セッション不要） */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!token) {
    return NextResponse.json({ error: 'リンクが無効です' }, { status: 400 });
  }

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword, token },
      headers: await headers(),
    });
    return NextResponse.json({ status: true });
  } catch (e) {
    console.error('[profile reset-password POST]', e);
    return NextResponse.json({ error: 'パスワードの変更に失敗しました' }, { status: 400 });
  }
}
