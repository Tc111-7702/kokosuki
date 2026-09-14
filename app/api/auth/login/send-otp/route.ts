import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { finalizeMailDelivery, runWithExternalMailDelivery } from '@/lib/mailDeliveryContext';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';
import { sendOtpEmail } from '@/lib/mail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/login/send-otp — 登録済みユーザーのみ sign-in OTP を送信 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = raw.toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });
  if (!user) {
    return NextResponse.json({ error: '登録されていないメールアドレスです' }, { status: 400 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: 'このアカウントは無効化されています。' }, { status: 400 });
  }

  try {
    const headersList = await headers();
    const mail = await runWithExternalMailDelivery(async () => {
      await auth.api.sendVerificationOTP({
        body: { email, type: 'sign-in' },
        headers: headersList,
      });
      const otpResponse = await auth.api.getVerificationOTP({
        query: { email, type: 'sign-in' },
        headers: headersList,
      });
      const otp = otpResponse?.otp;
      if (!otp) {
        throw new Error('認証コードの生成に失敗しました');
      }
      const result = await sendOtpEmail({ email, otp, type: 'sign-in' });
      finalizeMailDelivery(result);
      return result;
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
