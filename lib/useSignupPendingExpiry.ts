'use client';

import { useCallback, useEffect, useRef } from 'react';
import { clearSignupPendingSession } from '@/lib/signupPendingCancel';
import { SIGNUP_PENDING_CHECK_INTERVAL_MS } from '@/lib/signupPendingCookie';

/** SignupPending の PATCH / complete 等がセション切れか */
export function isSignupPendingSessionExpiredResponse(res: Response): boolean {
  return res.status === 401;
}

function isPendingRecordExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return true;
  const parsed = Date.parse(expiresAt);
  return !Number.isFinite(parsed) || parsed <= Date.now();
}

/** SignupPending を削除してコールバックへ遷移 */
export async function redirectOnSignupPendingExpired(onExpired: () => void): Promise<void> {
  await clearSignupPendingSession();
  onExpired();
}

/** SignupPending クッキー／DB を定期的に確認し、切れていたらメール入力へ戻す */
export function useSignupPendingExpiry(
  onExpired: () => void,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const expiredRef = useRef(false);

  const handleExpired = useCallback(async () => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    await redirectOnSignupPendingExpired(() => onExpiredRef.current());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const checkSession = async () => {
      if (expiredRef.current) return;

      const res = await fetch('/api/auth/signup/pending', { credentials: 'include' });
      if (!res.ok) {
        void handleExpired();
        return;
      }

      const data = await res.json().catch(() => null);
      if (isPendingRecordExpired(typeof data?.expiresAt === 'string' ? data.expiresAt : undefined)) {
        void handleExpired();
      }
    };

    void checkSession();
    const interval = window.setInterval(() => {
      void checkSession();
    }, SIGNUP_PENDING_CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, handleExpired]);

  return { handleExpired };
}
