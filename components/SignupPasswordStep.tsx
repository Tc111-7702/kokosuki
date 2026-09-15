'use client';

import { useState } from 'react';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { isPasswordPolicyValid, validatePasswordPolicy } from '@/lib/passwordPolicy';
import {
  isSignupPendingSessionExpiredResponse,
  useSignupPendingExpiry,
} from '@/lib/useSignupPendingExpiry';
import { useAuthBackIconColor, useAuthMutedTextColor, useAuthPrimaryButtonStyle, useAuthTextColor } from '@/lib/useAuthPrimaryButtonStyle';

interface Props {
  onBack: () => void;
  onContinue: () => void;
  onSessionExpired: () => void;
}

export function SignupPasswordStep({ onBack, onContinue, onSessionExpired }: Props) {
  const { handleExpired } = useSignupPendingExpiry(onSessionExpired);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = saving;
  const passwordsMatch = !confirm || password === confirm;
  const canSubmit =
    isPasswordPolicyValid(password)
    && password === confirm
    && confirm.length > 0
    && !busy;
  const submitStyle = useAuthPrimaryButtonStyle(canSubmit);
  const backIconColor = useAuthBackIconColor();
  const backLinkColor = useAuthMutedTextColor();
  const titleColor = useAuthTextColor();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup/pending', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (isSignupPendingSessionExpiredResponse(res)) {
          void handleExpired();
          return;
        }
        setError(typeof data?.error === 'string' ? data.error : 'パスワードの保存に失敗しました');
        return;
      }
      onContinue();
    } catch {
      setError('パスワードの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-email-step signup-app-font font-sans flex flex-col min-h-[100dvh] px-6 pt-4 pb-8 bg-white">
      <div className="w-full max-w-[360px] md:max-w-[520px] mx-auto flex flex-col flex-1 min-h-0">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="self-start -ml-1 p-1 active:opacity-60 disabled:opacity-50 md:hidden"
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
        </button>

        <div className="flex flex-col items-center w-full flex-1 justify-center">
          <h1
            className="text-[22px] font-black text-center leading-snug w-full"
            style={{ color: titleColor }}
          >
            パスワードを設定する
          </h1>

          <p
            className="mt-3 text-[13px] text-left md:text-center leading-relaxed px-1 w-full"
            style={{ color: 'var(--app-text-muted)' }}
          >
            ログイン時に使用するパスワードを設定してください
          </p>

          <PasswordPolicyHint className="mt-4 text-[11px] text-left md:text-center w-full px-1" />

          <form
            className="mt-6 w-full flex flex-col gap-4"
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
                autoComplete="new-password"
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

            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                placeholder="パスワード（確認）"
                disabled={busy}
                autoComplete="new-password"
                className="login-email-input w-full h-[52px] rounded-2xl px-4 pr-11 text-[15px] outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                disabled={busy}
                aria-label={showConfirm ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 active:opacity-60 disabled:opacity-50"
                style={{ color: '#888' }}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {!passwordsMatch ? (
              <p className="text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>
                パスワードが一致しません
              </p>
            ) : null}
            {error ? (
              <p className="text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              style={submitStyle}
              className="login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed"
            >
              {saving ? '保存中…' : '次へ'}
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
