'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { formatEmailOtpError } from '@/lib/emailOtpErrors';
import { useOtpResendCooldown } from '@/lib/useOtpResendCooldown';
import { OtpDigitInput } from '@/components/OtpDigitInput';
import { PasswordResetGlobeIllustration } from '@/components/ui/PasswordResetGlobeIllustration';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';
import { persistSavedLoginAccount } from '@/lib/persistSavedLoginAccount';

const OTP_MISMATCH = '認証コードが一致しません。';

function formatLoginOtpError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? '';
  if (code === 'INVALID_OTP') return OTP_MISMATCH;
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('invalid otp')) return OTP_MISMATCH;
  return formatEmailOtpError(error, OTP_MISMATCH);
}

export function LoginOtpStep({
  email,
  initialMailNotice,
  onBack,
}: {
  email: string;
  initialMailNotice?: string | null;
  onBack: () => void;
}) {
  const router = useRouter();
  const { remaining, canResend, restart } = useOtpResendCooldown(30);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailNotice, setMailNotice] = useState<string | null>(initialMailNotice ?? null);

  const busy = verifying || resending;
  const canSubmit = /^\d{6}$/.test(otp) && !busy;
  const prevOtpLenRef = useRef(0);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp) || verifying || resending) return;
    setVerifying(true);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.emailOtp({ email, otp });
      if (signInError) {
        setError(formatLoginOtpError(signInError));
        return;
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
      const res = await fetch('/api/auth/login/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="login-email-step flex flex-col min-h-screen px-6 pt-4 pb-8 bg-white">
      <div className="w-full max-w-[360px] md:max-w-[520px] mx-auto flex flex-col">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="self-start -ml-1 p-1 active:opacity-60 disabled:opacity-50 md:hidden"
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} color="#111111" />
        </button>

        <div className="-mt-1 md:mt-0 flex flex-col items-center w-full">
          <PasswordResetGlobeIllustration width={150} />

          <h1
            className="mt-6 text-[22px] font-black text-center leading-snug w-full"
            style={{ color: '#111111' }}
          >
            認証コードを入力する
          </h1>

          <p
            className="mt-3 text-[13px] text-left md:text-center leading-relaxed px-1 w-full"
            style={{ color: '#64748b' }}
          >
            <span className="font-bold" style={{ color: '#111111' }}>{email}</span>
            に送信された6桁の認証コードを入力してください。
          </p>

          <form
            className="mt-8 w-full flex flex-col items-center gap-4"
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
              <p className="text-[12px] font-bold -mt-1 text-center leading-relaxed w-full" style={{ color: '#2E7D32' }}>
                {mailNotice}
              </p>
            ) : null}
            {error ? (
              <p className="text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={!canResend || resending}
              className="login-otp-resend -mt-1 self-center disabled:cursor-not-allowed"
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
              className="login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed"
            >
              {verifying ? '認証中…' : '認証する'}
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="login-email-back-link hidden md:block w-full disabled:opacity-50"
            >
              戻る
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
