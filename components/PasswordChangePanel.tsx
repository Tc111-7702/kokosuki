'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';
import { isPasswordPolicyValid, validatePasswordPolicy } from '@/lib/passwordPolicy';
import { useOtpResendCooldown } from '@/lib/useOtpResendCooldown';
import {
  EMAIL_NOTICE_COLOR,
  emailButtonClass,
  emailErrorClass,
  emailFieldClass,
  emailFieldStyle,
  emailFormGroupClass,
  emailLabelClass,
  emailNoticeClass,
  emailPanelClass,
  emailPrimaryButtonStyle,
} from '@/components/emailChangeLayout';

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  show,
  onToggleShow,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className={emailFormGroupClass}>
      <label className={emailLabelClass} style={{ color: '#888' }}>{label}</label>
      <div className="relative w-full">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${emailFieldClass} h-11 md:h-[52px] pr-11 md:pr-12`}
          style={emailFieldStyle}
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
          className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg active:opacity-70 disabled:opacity-50"
          style={{ color: '#888' }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function PasswordChangePanel({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const { remaining, canResend, restart } = useOtpResendCooldown(30, true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const busy = pending || forgotBusy;
  const canSubmit =
    currentPassword.length > 0
    && isPasswordPolicyValid(newPassword)
    && newPassword === confirmPassword
    && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof d?.error === 'string' ? d.error : 'パスワードの変更に失敗しました');
        return;
      }
      router.push('/settings');
    } catch {
      setError('パスワードの変更に失敗しました');
    } finally {
      setPending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!canResend || forgotBusy) return;
    if (!email.trim()) {
      setForgotError('メールアドレスが未設定のため送信できません');
      return;
    }
    setForgotBusy(true);
    setForgotError(null);
    setForgotNotice(null);
    try {
      const redirectTo = `${window.location.origin}/resetPassword/${userId}`;
      const res = await fetch('/api/profile/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo }),
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
    <form
      className={`${emailPanelClass} md:gap-4`}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <PasswordField
        label="現在のパスワード"
        value={currentPassword}
        onChange={(v) => { setCurrentPassword(v); setError(null); }}
        placeholder="現在のパスワード"
        disabled={busy}
        autoComplete="current-password"
        show={showCurrent}
        onToggleShow={() => setShowCurrent((v) => !v)}
      />

      <div className="flex flex-col items-center gap-1 w-full">
        <button
          type="button"
          onClick={() => void handleForgotPassword()}
          disabled={busy || !canResend}
          className="text-[13px] font-bold underline underline-offset-2 disabled:opacity-50 self-center"
          style={{ color: '#555' }}
        >
          {forgotBusy
            ? '送信中…'
            : canResend
              ? 'パスワードを忘れた場合'
              : `パスワードを忘れた場合 : ${remaining}s`}
        </button>
        {forgotNotice ? (
          <p className={emailNoticeClass} style={{ color: EMAIL_NOTICE_COLOR }}>{forgotNotice}</p>
        ) : null}
        {forgotError ? (
          <p className={emailErrorClass} style={{ color: '#C4483C' }}>{forgotError}</p>
        ) : null}
      </div>

      <PasswordField
        label="新しいパスワード"
        value={newPassword}
        onChange={(v) => { setNewPassword(v); setError(null); }}
        placeholder="新しいパスワード"
        disabled={busy}
        autoComplete="new-password"
        show={showNew}
        onToggleShow={() => setShowNew((v) => !v)}
      />

      <PasswordField
        label="新しいパスワード（確認）"
        value={confirmPassword}
        onChange={(v) => { setConfirmPassword(v); setError(null); }}
        placeholder="新しいパスワード（確認）"
        disabled={busy}
        autoComplete="new-password"
        show={showConfirm}
        onToggleShow={() => setShowConfirm((v) => !v)}
      />

      <PasswordPolicyHint className="text-[11px] md:text-[12px] text-left md:text-center w-full" />

      {newPassword && confirmPassword && newPassword !== confirmPassword ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>パスワードが一致しません</p>
      ) : null}
      {error ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={emailButtonClass}
        style={emailPrimaryButtonStyle(canSubmit)}
      >
        {pending ? '変更中…' : 'パスワードの再設定'}
      </button>
    </form>
  );
}
