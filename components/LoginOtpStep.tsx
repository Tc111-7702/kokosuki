'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { formatEmailOtpError, isOtpExpiredError } from '@/lib/emailOtpErrors';
import { useOtpResendCooldown } from '@/lib/useOtpResendCooldown';
import {
  isSignupPendingSessionExpiredResponse,
  useSignupPendingExpiry,
} from '@/lib/useSignupPendingExpiry';
import { OtpDigitInput } from '@/components/OtpDigitInput';
import { PasswordResetGlobeIllustration } from '@/components/ui/PasswordResetGlobeIllustration';
import { MailDeliveryNotice } from '@/components/MailDeliveryNotice';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';
import { persistSavedLoginAccount } from '@/lib/persistSavedLoginAccount';
import {
  useAuthBackIconColor,
  useAuthMutedTextColor,
  useAuthPrimaryButtonStyle,
  useAuthResendLinkColor,
} from '@/lib/useAuthPrimaryButtonStyle';

const OTP_MISMATCH = '認証コードが一致しません。';

function formatLoginOtpError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? '';
  if (code === 'INVALID_OTP') return OTP_MISMATCH;
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('invalid otp')) return OTP_MISMATCH;
  return formatEmailOtpError(error, OTP_MISMATCH);
}

export type LoginOtpFlow = 'login' | 'signup';

export function LoginOtpStep({
  email,
  initialMailNotice,
  onBack,
  onVerified,
  onSessionExpired,
  flow = 'login',
  resendPath,
}: {
  email: string;
  initialMailNotice?: string | null;
  onBack: () => void;
  onVerified?: (email: string) => void;
  onSessionExpired?: () => void;
  flow?: LoginOtpFlow;
  resendPath?: string;
}) {
  const isSignup = flow === 'signup';
  const resolvedResendPath = resendPath ?? (isSignup ? '/api/auth/signup/send-otp' : '/api/auth/login/send-otp');
  const router = useRouter();
  const { remaining, canResend, restart } = useOtpResendCooldown(30);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailNotice, setMailNotice] = useState<string | null>(initialMailNotice ?? null);

  const { handleExpired } = useSignupPendingExpiry(onSessionExpired ?? onBack, { enabled: false });

  const busy = verifying || resending;
  const canSubmit = /^\d{6}$/.test(otp) && !busy;
  const submitStyle = useAuthPrimaryButtonStyle(canSubmit);
  const backIconColor = useAuthBackIconColor();
  const backLinkColor = useAuthMutedTextColor();
  const resendDisabled = !canResend || resending;
  const resendLinkColor = useAuthResendLinkColor(resendDisabled);
  const prevOtpLenRef = useRef(0);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp) || verifying || resending) return;
    setVerifying(true);
    setError(null);
    try {
      if (isSignup) {
        const res = await fetch('/api/auth/signup/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (isSignupPendingSessionExpiredResponse(res)) {
            void handleExpired();
            return;
          }
          const verifyError = {
            code: typeof data?.code === 'string' ? data.code : undefined,
            message: typeof data?.error === 'string' ? data.error : undefined,
          };
          if (isOtpExpiredError(verifyError)) {
            void handleExpired();
            return;
          }
          setError(formatLoginOtpError(verifyError));
          return;
        }
        onVerified?.(email);
        return;
      } else {
        const { error: signInError } = await authClient.signIn.emailOtp({ email, otp });
        if (signInError) {
          if (isOtpExpiredError(signInError)) {
            onBack();
            return;
          }
          setError(formatLoginOtpError(signInError));
          return;
        }
      }
      await persistSavedLoginAccount(email);
      router.replace('/home');
      router.refresh();
    } catch {
      setError('認証に失敗しました');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const len = otp.length;
    if (len === 6 && prevOtpLenRef.current < 6 && !verifying && !resending) {
      void handleVerify();
    }
    prevOtpLenRef.current = len;
  }, [otp, verifying, resending]);

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await fetch(resolvedResendPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : '認証コードの再送信に失敗しました');
        return;
      }
      setMailNotice(formatMailDeliveryNotice(
        data?.mail as MailDeliveryResult | undefined,
        email,
        `${email} に認証コードを再送信しました`,
      ));
      setOtp('');
      restart();
    } catch {
      setError('認証コードの再送信に失敗しました');
    } finally {
      setResending(false);
    }
  };

  const fontClass = flow === 'signup' ? 'signup-app-font font-sans' : '';

  return (
    <div className={`login-email-step flex flex-col min-h-screen px-6 pt-4 pb-8 bg-white ${fontClass}`}>
      <div className="w-full max-w-[360px] md:max-w-[520px] mx-auto flex flex-col">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="self-start -ml-1 p-1 active:opacity-60 disabled:opacity-50 md:hidden"
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
        </button>

        <div className="-mt-1 md:mt-0 flex flex-col items-center w-full">
          <PasswordResetGlobeIllustration width={150} />

          <h1
            className="mt-6 text-[22px] font-black text-center leading-snug w-full"
            style={{ color: 'var(--app-text)' }}
          >
            認証コードを入力する
          </h1>

          <p
            className="mt-3 text-[13px] text-left md:text-center leading-relaxed px-1 w-full"
            style={{ color: 'var(--app-text-muted)' }}
          >
            <span className="font-bold" style={{ color: 'var(--app-text)' }}>{email}</span>
            に送信された6桁の認証コードを入力してください。
          </p>

          {error ? (
            <p className="hidden md:block mt-3 mb-0 text-[13px] font-bold text-center w-full" style={{ color: '#C4483C' }}>
              {error}
            </p>
          ) : null}

          <form
            className={`mt-8 w-full flex flex-col items-center gap-4${error ? ' md:mt-2' : ''}`}
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
          >
            <OtpDigitInput
              value={otp}
              onChange={(next) => {
                setOtp(next);
                setError(null);
              }}
              disabled={busy}
            />

            {mailNotice ? (
              <MailDeliveryNotice className="-mt-1" centerOnMobile>{mailNotice}</MailDeliveryNotice>
            ) : null}
            {error ? (
              <p className="md:hidden text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resendDisabled}
              className="login-otp-resend -mt-1 self-center disabled:cursor-not-allowed"
              style={{ color: resendLinkColor }}
            >
              {resending
                ? '再送信中…'
                : canResend
                  ? 'コードを再送'
                  : `コードを再送 : ${remaining}s`}
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              style={submitStyle}
              className="login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed"
            >
              {verifying ? '認証中…' : '認証する'}
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="login-email-back-link hidden md:block w-full disabled:opacity-50"
              style={{ color: backLinkColor }}
            >
              戻る
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
