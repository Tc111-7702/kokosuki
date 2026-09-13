import { auth } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/mail';
import {
  consumeExternalPasswordReset,
  finalizeMailDelivery,
  runWithExternalMailDelivery,
  runWithMailDeliveryContext,
} from '@/lib/mailDeliveryContext';
import type { MailDeliveryResult } from '@/lib/mail';

/** Better Auth でトークンを発行し、メール送信結果を確実に返す。 */
export async function requestProfilePasswordResetMail({
  email,
  redirectTo,
  requestHeaders,
}: {
  email: string;
  redirectTo: string;
  requestHeaders: Headers;
}): Promise<MailDeliveryResult> {
  const { mail } = await runWithMailDeliveryContext(async () => {
    let pending = null as ReturnType<typeof consumeExternalPasswordReset>;
    await runWithExternalMailDelivery(async () => {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo },
        headers: requestHeaders,
      });
      pending = consumeExternalPasswordReset();
    });
    if (!pending) {
      throw new Error('再設定メールの送信準備に失敗しました');
    }
    const result = await sendPasswordResetEmail(pending);
    finalizeMailDelivery(result);
    return result;
  });
  if (!mail) {
    throw new Error('再設定メールの送信に失敗しました');
  }
  return mail;
}
