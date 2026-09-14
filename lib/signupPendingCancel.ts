import type { SignupPendingCancelStep } from '@/lib/signupPendingTypes';

/** Cookie に紐づく SignupPending を DB から完全削除し Cookie を消す */
export async function clearSignupPendingSession(): Promise<void> {
  await fetch('/api/auth/signup/clear-pending', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
}

/** 戻る操作: SignupPending から当該ステップ以降の入力を削除 */
export async function cancelSignupPending(fromStep: SignupPendingCancelStep): Promise<boolean> {
  const res = await fetch('/api/auth/signup/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fromStep }),
  });
  return res.ok;
}
