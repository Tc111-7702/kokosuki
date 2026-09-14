'use client';

import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { formatEmailOtpError } from '@/lib/emailOtpErrors';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';
import { OtpDigitInput } from '@/components/OtpDigitInput';
import { useOtpResendCooldown } from '@/lib/useOtpResendCooldown';
import { MailDeliveryNotice } from '@/components/MailDeliveryNotice';
import {
  EMAIL_NOTICE_COLOR,
  emailBodyClass,
  emailButtonClass,
  emailFormGroupClass,
  emailLabelClass,
  emailErrorClass,
  emailPanelClass,
  emailPrimaryButtonStyle,
} from '@/components/emailChangeLayout';

export function EmailOtpPanel({
  newEmail,
  initialMailNotice,
  onVerified,
}: {
  newEmail: string;
  initialMailNotice?: string | null;
  onVerified: () => void;
}) {
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
      const { error: changeError } = await authClient.emailOtp.changeEmail({ newEmail, otp });
      if (changeError) {
        setError(formatEmailOtpError(changeError, '認証コードが正しくありません'));
        return;
      }
      onVerified();
    } catch {
      setError('認証コードの確認に失敗しました');
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
      const res = await fetch('/api/profile/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : '認証メールの再送信に失敗しました');
        return;
      }
      setMailNotice(formatMailDeliveryNotice(
        data?.mail as MailDeliveryResult | undefined,
        newEmail,
        `${newEmail} に認証コードを再送信しました`,
      ));
      setOtp('');
      restart();
    } catch {
      setError('認証メールの再送信に失敗しました');
    } finally {
      setResending(false);
    }
  };

  return (
    <form
      className={emailPanelClass}
      onSubmit={(e) => {
        e.preventDefault();
        void handleVerify();
      }}
    >
      <p className={emailBodyClass} style={{ color: '#666' }}>
        <span className="font-bold" style={{ color: '#111' }}>{newEmail}</span>
        {' '}に送信した6桁の認証コードを入力してください。
      </p>
      <div className={emailFormGroupClass}>
        <label className={emailLabelClass} style={{ color: '#888' }}>認証コード</label>
        <OtpDigitInput
          value={otp}
          onChange={(next) => {
            setOtp(next);
            setError(null);
          }}
          disabled={busy}
        />
      </div>
      {mailNotice ? (
        <MailDeliveryNotice color={EMAIL_NOTICE_COLOR}>{mailNotice}</MailDeliveryNotice>
      ) : null}
      {error ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>{error}</p>
      ) : null}
      <div className="flex flex-col md:flex-row md:flex-nowrap items-center justify-center gap-2 md:gap-3 w-full">
        <button
          type="submit"
          disabled={!canSubmit}
          className={emailButtonClass}
          style={emailPrimaryButtonStyle(canSubmit)}
        >
          {verifying ? '確認中…' : '認証する'}
        </button>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={busy || !canResend}
          className={emailButtonClass}
          style={{ background: '#F4F1E4', color: '#555' }}
        >
          {resending
            ? '再送信中…'
            : canResend
              ? '認証メールを再送信'
              : `認証メールを再送信 : ${remaining}s`}
        </button>
      </div>
    </form>
  );
}
