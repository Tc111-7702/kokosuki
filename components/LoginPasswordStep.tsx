'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { MailDeliveryNotice } from '@/components/MailDeliveryNotice';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';
import { useOtpResendCooldown } from '@/lib/useOtpResendCooldown';
import { PasswordResetGlobeIllustration } from '@/components/ui/PasswordResetGlobeIllustration';
import { persistSavedLoginAccount } from '@/lib/persistSavedLoginAccount';
import {
  useAuthBackIconColor,
  useAuthMutedTextColor,
  useAuthPrimaryButtonStyle,
  useAuthResendLinkColor,
} from '@/lib/useAuthPrimaryButtonStyle';

function formatPasswordSignInError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? '';
  if (code === 'INVALID_EMAIL_OR_PASSWORD') return 'パスワードが正しくありません';
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('invalid email or password')) return 'パスワードが正しくありません';
  if (msg.includes('invalid password')) return 'パスワードが正しくありません';
  return 'ログインに失敗しました';
}

export function LoginPasswordStep({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { remaining, canResend, restart } = useOtpResendCooldown(30, true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const busy = signingIn || forgotBusy;
  const canSubmit = password.length > 0 && !busy;
  const submitStyle = useAuthPrimaryButtonStyle(canSubmit);
  const backIconColor = useAuthBackIconColor();
  const backLinkColor = useAuthMutedTextColor();
  const forgotLinkDisabled = busy || !canResend;
  const forgotLinkColor = useAuthResendLinkColor(forgotLinkDisabled);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSigningIn(true);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        setError(formatPasswordSignInError(signInError));
        return;
      }
      await persistSavedLoginAccount(email);
      router.replace('/home');
      router.refresh();
    } catch {
      setError('ログインに失敗しました');
    } finally {
      setSigningIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!canResend || forgotBusy || signingIn) return;
    setForgotBusy(true);
    setForgotError(null);
    setForgotNotice(null);
    try {
      const res = await fetch('/api/auth/login/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setForgotError(typeof data?.error === 'string' ? data.error : '再設定メールの送信に失敗しました');
        return;
      }
      setForgotNotice(formatMailDeliveryNotice(
        data?.mail as MailDeliveryResult | undefined,
        email,
        '再設定メールを送信しました',
      ));
      restart();
    } catch {
      setForgotError('再設定メールの送信に失敗しました');
    } finally {
      setForgotBusy(false);
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
          <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
        </button>

        <div className="-mt-1 md:mt-0 flex flex-col items-center w-full">
          <PasswordResetGlobeIllustration width={150} />

          <h1
            className="mt-6 text-[22px] font-black text-center leading-snug w-full"
            style={{ color: 'var(--app-text)' }}
          >
            パスワードでログイン
          </h1>

          <p
            className="mt-3 text-[13px] text-left md:text-center leading-relaxed px-1 w-full"
            style={{ color: 'var(--app-text-muted)' }}
          >
            <span className="font-bold" style={{ color: 'var(--app-text)' }}>{email}</span>
            {' '}のパスワードを入力してください
          </p>

          <form
            className="mt-8 w-full flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="パスワード"
                disabled={busy}
                autoComplete="current-password"
                className="login-email-input w-full h-[52px] rounded-2xl px-4 pr-11 text-[15px] outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 active:opacity-60 disabled:opacity-50"
                style={{ color: '#888' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error ? (
              <p className="text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              style={submitStyle}
              className="login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed"
            >
              {signingIn ? 'ログイン中…' : 'ログイン'}
            </button>

            <div className="flex flex-col items-center gap-1 -mt-1 w-full">
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={forgotLinkDisabled}
                className="login-otp-resend self-center disabled:cursor-not-allowed"
                style={{ color: forgotLinkColor }}
              >
                {forgotBusy
                  ? '送信中…'
                  : canResend
                    ? 'パスワードをお忘れですか？'
                    : `パスワードをお忘れですか？ : ${remaining}s`}
              </button>
              {forgotNotice ? (
                <MailDeliveryNotice centerOnMobile>{forgotNotice}</MailDeliveryNotice>
              ) : null}
              {forgotError ? (
                <p className="text-[12px] font-bold text-center w-full" style={{ color: '#C4483C' }}>
                  {forgotError}
                </p>
              ) : null}
            </div>

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
