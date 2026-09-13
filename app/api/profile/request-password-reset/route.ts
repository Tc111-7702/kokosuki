import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';
import { requestProfilePasswordResetMail } from '@/lib/requestProfilePasswordResetMail';

/** POST /api/profile/request-password-reset — パスワード再設定メールを送信 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const redirectTo = typeof body?.redirectTo === 'string' ? body.redirectTo.trim() : '';

  if (!email) {
    return NextResponse.json({ error: 'メールアドレスが未設定のため送信できません' }, { status: 400 });
  }
  if (!redirectTo) {
    return NextResponse.json({ error: '再設定 URL が不正です' }, { status: 400 });
  }

  try {
    const mail = await requestProfilePasswordResetMail({
      email,
      redirectTo,
      requestHeaders: await headers(),
    });
    return NextResponse.json({ success: true, mail });
  } catch (e) {
    console.error('[profile request-password-reset POST]', e);
    return NextResponse.json(
      { error: formatMailSendError(e, '再設定メールの送信に失敗しました') },
      { status: 500 },
    );
  }
}
