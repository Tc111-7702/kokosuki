import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { runWithMailDeliveryContext } from '@/lib/mailDeliveryContext';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/login/send-otp — 登録済みユーザーのみ sign-in OTP を送信 */
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
    const headersList = await headers();
    const { mail } = await runWithMailDeliveryContext(async () => {
      await auth.api.sendVerificationOTP({
        body: { email, type: 'sign-in' },
        headers: headersList,
      });
    });
    return NextResponse.json({ success: true, mail });
  } catch (e) {
    console.error('[login send-otp]', e);
    return NextResponse.json(
      { error: formatMailSendError(e, '認証コードの送信に失敗しました') },
      { status: 500 },
    );
  }
}
