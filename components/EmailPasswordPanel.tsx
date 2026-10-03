'use client';

import { useEffect, useState } from 'react';
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
  // パスワード誤入力5回でサーバー側(DB・アカウント単位)が15分ロック。429 を受けたらロック表示する。
  const [locked, setLocked] = useState(false);

  // マウント時にロック状態を確認（期限切れはサーバー側で削除）。
  useEffect(() => {
    let alive = true;
    void fetch('/api/profile/verify-password', { method: 'GET', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data?.locked) setLocked(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const canSubmit = password.length > 0 && !pending && !locked;

  const handleVerify = async () => {
    if (!canSubmit) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        // 誤入力が規定回数に達した（サーバーがロック）→ 赤字＋入力無効。
        if (res.status === 429) {
          setLocked(true);
          return;
        }
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
            aria-label="現在のパスワード"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={pending || locked}
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

      {locked ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>
          パスワードを規定回数間違えたため、セキュリティ保護の観点から一時的に入力を停止しています
          <br />
          しばらく時間をおいてから再度お試しください。
        </p>
      ) : error ? (
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
