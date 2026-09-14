import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as db from '@/lib/db';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';
import { requestProfilePasswordResetMail } from '@/lib/requestProfilePasswordResetMail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requestOrigin(req: Request): string {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = forwardedHost ?? req.headers.get('host');
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/** POST /api/auth/login/request-password-reset — ログイン画面からパスワード再設定メールを送信 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  const user = await db.findUserAuthByEmail(email);
  if (!user) {
    return NextResponse.json({ error: '登録されていないメールアドレスです' }, { status: 400 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: 'このアカウントは無効化されています。' }, { status: 400 });
  }

  try {
    const redirectTo = `${requestOrigin(req)}/resetPassword/${user.id}`;
    const mail = await requestProfilePasswordResetMail({
      email,
      redirectTo,
      requestHeaders: await headers(),
    });
    return NextResponse.json({ success: true, mail });
  } catch (e) {
    console.error('[login request-password-reset]', e);
    return NextResponse.json(
      { error: formatMailSendError(e, '再設定メールの送信に失敗しました') },
      { status: 500 },
    );
  }
}
