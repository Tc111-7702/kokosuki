'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  emailBodyClass,
  emailButtonClass,
  emailFieldClass,
  emailFieldStyle,
  emailFormGroupClass,
  emailLabelClass,
  emailErrorClass,
  emailPanelClass,
  emailPrimaryButtonStyle,
} from '@/components/emailChangeLayout';

export function EmailPasswordPanel({ onVerified }: { onVerified: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length > 0 && !pending;

  const handleVerify = async () => {
    if (!canSubmit) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error ?? 'パスワードが違います');
        return;
      }
      onVerified();
    } catch {
      setError('パスワードが違います');
    } finally {
      setPending(false);
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
        メールアドレスを変更するには、現在のパスワードを入力してください。
      </p>

      <div className={emailFormGroupClass}>
        <label className={emailLabelClass} style={{ color: '#888' }}>パスワード</label>
        <div className="relative w-full">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={pending}
            placeholder="現在のパスワード"
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

      {error ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={emailButtonClass}
        style={emailPrimaryButtonStyle(canSubmit)}
      >
        {pending ? '確認中…' : '確認する'}
      </button>
    </form>
  );
}
