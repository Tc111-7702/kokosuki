import { AsyncLocalStorage } from 'node:async_hooks';
import type { MailDeliveryResult } from '@/lib/mail';

type MailDeliveryBox = { mail?: MailDeliveryResult };

export type PendingPasswordResetMail = {
  email: string;
  url: string;
  name: string;
};

type ExternalMailCapture = {
  passwordReset?: PendingPasswordResetMail;
};

const mailBoxStorage = new AsyncLocalStorage<MailDeliveryBox>();
const externalMailStorage = new AsyncLocalStorage<ExternalMailCapture>();

export async function runWithMailDeliveryContext<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; mail: MailDeliveryResult | null }> {
  const box: MailDeliveryBox = {};
  const result = await mailBoxStorage.run(box, fn);
  return { result, mail: box.mail ?? null };
}

/** Better Auth 経由の二重送信を避け、呼び出し元で mail を返すときに使う。 */
export async function runWithExternalMailDelivery<T>(fn: () => Promise<T>): Promise<T> {
  return externalMailStorage.run({}, fn);
}

export function isExternalMailDelivery(): boolean {
  return externalMailStorage.getStore() !== undefined;
}

export function captureExternalPasswordReset(payload: PendingPasswordResetMail): void {
  const store = externalMailStorage.getStore();
  if (store) store.passwordReset = payload;
}

export function consumeExternalPasswordReset(): PendingPasswordResetMail | null {
  const store = externalMailStorage.getStore();
  const pending = store?.passwordReset ?? null;
  if (store) store.passwordReset = undefined;
  return pending;
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
