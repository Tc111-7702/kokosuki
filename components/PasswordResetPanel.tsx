'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { PasswordResetCompletePanel } from '@/components/PasswordResetCompletePanel';
import { isPasswordPolicyValid, validatePasswordPolicy } from '@/lib/passwordPolicy';
import {
  emailBodyClass,
  emailButtonClass,
  emailErrorClass,
  emailFieldClass,
  emailFieldStyle,
  emailFormGroupClass,
  emailLabelClass,
  emailPanelClass,
  emailPrimaryButtonStyle,
} from '@/components/emailChangeLayout';

export function PasswordResetPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const linkError = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    isPasswordPolicyValid(password) && password === confirm && !!token && !pending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password, token }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof d?.error === 'string' ? d.error : 'パスワードの変更に失敗しました');
        return;
      }
      setDone(true);
    } catch {
      setError('パスワードの変更に失敗しました');
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return <PasswordResetCompletePanel />;
  }

  if (linkError === 'INVALID_TOKEN' || (!token && linkError)) {
    return (
      <div className={emailPanelClass}>
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>
          リンクの有効期限が切れているか、無効です。設定画面から再設定メールを送り直してください。
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={emailPanelClass}>
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>
          無効なリンクです。メール内のリンクから開き直してください。
        </p>
      </div>
    );
  }

  return (
    <form
      className={emailPanelClass}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <p className={emailBodyClass} style={{ color: '#666' }}>新しいパスワードを入力してください。</p>
      <PasswordPolicyHint className="text-[11px] md:text-[12px] text-left md:text-center w-full" />

      <div className={emailFormGroupClass}>
        <label className={emailLabelClass} style={{ color: '#888' }}>新しいパスワード</label>
        <div className="relative w-full">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={pending}
            autoComplete="new-password"
            className={`${emailFieldClass} h-11 md:h-[52px] pr-11 md:pr-12`}
            style={emailFieldStyle}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={pending}
            aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg active:opacity-70 disabled:opacity-50"
            style={{ color: '#888' }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className={emailFormGroupClass}>
        <label className={emailLabelClass} style={{ color: '#888' }}>新しいパスワード（確認）</label>
        <div className="relative w-full">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            disabled={pending}
            autoComplete="new-password"
            className={`${emailFieldClass} h-11 md:h-[52px] pr-11 md:pr-12`}
            style={emailFieldStyle}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            disabled={pending}
            aria-label={showConfirm ? 'パスワードを隠す' : 'パスワードを表示'}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg active:opacity-70 disabled:opacity-50"
            style={{ color: '#888' }}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {password && confirm && password !== confirm ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>パスワードが一致しません</p>
      ) : null}
      {error ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || pending}
        className={emailButtonClass}
        style={emailPrimaryButtonStyle(canSubmit && !pending)}
      >
        {pending ? '変更中…' : 'パスワードを変更する'}
      </button>
    </form>
  );
}
