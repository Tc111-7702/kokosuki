import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { runWithMailDeliveryContext } from '@/lib/mailDeliveryContext';
import { formatMailSendError } from '@/lib/mailDeliveryNotice';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/profile/request-email-change — メールアドレス変更 OTP を送信 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const newEmail = typeof body?.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';
  if (!newEmail || !EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  try {
    const { mail } = await runWithMailDeliveryContext(async () => {
      await auth.api.requestEmailChangeEmailOTP({
        body: { newEmail },
        headers: await headers(),
      });
    });
    return NextResponse.json({ success: true, mail });
  } catch (e) {
    console.error('[profile request-email-change POST]', e);
    return NextResponse.json(
      { error: formatMailSendError(e, '認証メールの送信に失敗しました') },
      { status: 500 },
    );
  }
}
