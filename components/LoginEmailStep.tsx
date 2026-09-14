'use client';

import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { PasswordResetGlobeIllustration } from '@/components/ui/PasswordResetGlobeIllustration';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_PART_RE = /^[^\s@]+$/;

export type LoginEmailProvider = 'email' | 'google' | 'apple';

const FIXED_SUFFIX: Partial<Record<LoginEmailProvider, string>> = {
  google: '@gmail.com',
  apple: '@icloud.com',
};

const FULL_DOMAIN: Partial<Record<LoginEmailProvider, string>> = {
  google: '@gmail.com',
  apple: '@icloud.com',
};

export type LoginEmailFlow = 'login' | 'signup';

interface Props {
  provider: LoginEmailProvider;
  flow?: LoginEmailFlow;
  onBack: () => void;
  onSent?: (email: string, notice?: string) => void;
  onPasswordLogin?: (email: string) => void;
}

export function LoginEmailStep({
  provider,
  flow = 'login',
  onBack,
  onSent,
  onPasswordLogin,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const suffix = FIXED_SUFFIX[provider];
  const trimmed = value.trim();
  const busy = sending || verifyingEmail;

  const fullEmail = suffix
    ? `${trimmed}${FULL_DOMAIN[provider] ?? ''}`.toLowerCase()
    : trimmed.toLowerCase();

  const canSubmit = suffix
    ? LOCAL_PART_RE.test(trimmed) && trimmed.length > 0 && !busy
    : EMAIL_RE.test(trimmed) && !busy;

  const isSignup = flow === 'signup';
  const sendOtpPath = isSignup ? '/api/auth/signup/send-otp' : '/api/auth/login/send-otp';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(sendOtpPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: fullEmail }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : '認証コードの送信に失敗しました');
        return;
      }
      const notice = formatMailDeliveryNotice(
        data?.mail as MailDeliveryResult | undefined,
        fullEmail,
        `${fullEmail} に認証コードを送信しました`,
      );
      onSent?.(fullEmail, notice);
    } catch {
      setError('認証コードの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!canSubmit || !onPasswordLogin) return;
    setVerifyingEmail(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'メールアドレスの確認に失敗しました');
        return;
      }
      onPasswordLogin(fullEmail);
    } catch {
      setError('メールアドレスの確認に失敗しました');
    } finally {
      setVerifyingEmail(false);
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
            {isSignup ? 'メールアドレスで作成する' : 'メールアドレスでログイン'}
          </h1>

          <p
            className="mt-3 text-[13px] text-left md:text-center leading-relaxed px-1 w-full"
            style={{ color: '#64748b' }}
          >
            {isSignup
              ? '登録完了時に通知するために、連絡可能なメールアドレスを入力してください'
              : 'アカウント登録時に使用した、メールアドレスを入力してください'}
          </p>

          <form
            className="mt-8 w-full flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div
              className={`relative${suffix ? ' login-email-input-wrap' : ''}${value ? ' login-email-input-wrap-has-value' : ''}`}
            >
              <input
                type={suffix ? 'text' : 'email'}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                placeholder={suffix ? '例：cocosuki' : '例：cocosuki@example.com'}
                disabled={busy}
                autoComplete={suffix ? 'username' : 'email'}
                className={`login-email-input w-full h-[52px] rounded-2xl px-4 text-[15px] outline-none disabled:opacity-50${suffix ? ' login-email-input-suffix' : ' pr-11'}`}
              />
              {suffix ? (
                <span className="login-email-fixed-suffix" aria-hidden="true">
                  {suffix}
                </span>
              ) : null}
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    setValue('');
                    setError(null);
                  }}
                  disabled={busy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60 disabled:opacity-50"
                  style={{ background: '#E8E8E8' }}
                  aria-label="入力をクリア"
                >
                  <X size={14} color="#888" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>

            {error ? (
              <p className="text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed"
            >
              {sending ? '送信中…' : '認証コードを送信'}
            </button>

            {!isSignup && onPasswordLogin ? (
              <button
                type="button"
                onClick={() => void handlePasswordLogin()}
                disabled={!canSubmit}
                className="login-otp-resend self-center disabled:cursor-not-allowed"
              >
                {verifyingEmail ? '確認中…' : 'パスワードでログイン'}
              </button>
            ) : null}

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
