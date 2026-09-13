import { AsyncLocalStorage } from 'node:async_hooks';
import type { MailDeliveryResult } from '@/lib/mail';

type MailDeliveryBox = { mail?: MailDeliveryResult };

const mailBoxStorage = new AsyncLocalStorage<MailDeliveryBox>();

export async function runWithMailDeliveryContext<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; mail: MailDeliveryResult | null }> {
  const box: MailDeliveryBox = {};
  const result = await mailBoxStorage.run(box, fn);
  return { result, mail: box.mail ?? null };
}

export function recordMailDelivery(result: MailDeliveryResult): void {
  const store = mailBoxStorage.getStore();
  if (store) store.mail = result;
}

/** 送信結果を記録し、本番で未達なら例外を投げる。 */
export function finalizeMailDelivery(result: MailDeliveryResult): void {
  recordMailDelivery(result);
  if (result.mode === 'resend') return;
  if (process.env.NODE_ENV === 'development') return;
  throw new Error('メールの送信に失敗しました');
}
