'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { SignupProfileFieldStep } from '@/components/SignupProfileFieldStep';
import {
  isSignupPendingSessionExpiredResponse,
  redirectOnSignupPendingExpired,
} from '@/lib/useSignupPendingExpiry';

const NAME_MAX = 30;

interface Props {
  onBack: () => void;
  onContinue: () => void;
  onSessionExpired: () => void;
}

/** 新規登録: ニックネーム入力 */
export function SignupNicknameStep({ onBack, onContinue, onSessionExpired }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= NAME_MAX && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup/pending', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (isSignupPendingSessionExpiredResponse(res)) {
          await redirectOnSignupPendingExpired(onSessionExpired);
          return;
        }
        setError(typeof data?.error === 'string' ? data.error : 'ニックネームの保存に失敗しました');
        return;
      }
      onContinue();
    } catch {
      setError('ニックネームの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SignupProfileFieldStep
      step={1}
      title="ニックネーム"
      description="プロフィールに表示する名前を入力してください。あとで変更できます。"
      submitLabel="次へ"
      canSubmit={canSubmit}
      busy={saving}
      error={error}
      onBack={onBack}
      onSubmit={handleSubmit}
      onSessionExpired={onSessionExpired}
    >
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="あなたのニックネーム"
          disabled={saving}
          autoComplete="nickname"
          maxLength={NAME_MAX}
          className="login-email-input w-full h-[52px] rounded-2xl px-4 pr-11 text-[14px] md:text-[15px] outline-none disabled:opacity-50"
          style={{ borderColor: name ? '#FFCD31' : undefined }}
        />
        {name ? (
          <button
            type="button"
            onClick={() => {
              setName('');
              setError(null);
            }}
            disabled={saving}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60 disabled:opacity-50"
            style={{ background: '#E8E8E8' }}
            aria-label="入力をクリア"
          >
            <X size={14} color="#888" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </SignupProfileFieldStep>
  );
}
