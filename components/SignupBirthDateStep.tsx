'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SignupProfileFieldStep } from '@/components/SignupProfileFieldStep';
import {
  isSignupPendingSessionExpiredResponse,
  redirectOnSignupPendingExpired,
} from '@/lib/useSignupPendingExpiry';

interface Props {
  onBack: () => void;
  onContinue: () => void;
  onSessionExpired: () => void;
}

function formatBirthDateDisplay(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${year} / ${month} / ${day}`;
}

/** 新規登録: 生年月日入力 */
export function SignupBirthDateStep({ onBack, onContinue, onSessionExpired }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = birthDate.length > 0 && !saving;

  useEffect(() => {
    void fetch('/api/auth/signup/pending', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.birthDate === 'string' && data.birthDate) {
          setBirthDate(data.birthDate);
        }
      })
      .catch(() => undefined);
  }, []);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input || saving) return;
    input.showPicker?.();
    input.focus();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup/pending', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ birthDate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (isSignupPendingSessionExpiredResponse(res)) {
          await redirectOnSignupPendingExpired(onSessionExpired);
          return;
        }
        setError(typeof data?.error === 'string' ? data.error : '生年月日の保存に失敗しました');
        return;
      }
      onContinue();
    } catch {
      setError('生年月日の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SignupProfileFieldStep
      step={2}
      title="生年月日"
      description="生年月日は公開されません。また登録変更することができません。"
      submitLabel="次へ"
      canSubmit={canSubmit}
      busy={saving}
      error={error}
      onBack={onBack}
      onSubmit={handleSubmit}
      onSessionExpired={onSessionExpired}
    >
      <div className="relative">
        <div
          className="login-email-input w-full h-[52px] rounded-2xl px-4 pr-11 text-[14px] md:text-[15px] text-left flex items-center pointer-events-none"
          style={{ borderColor: birthDate ? '#FFCD31' : undefined, color: birthDate ? '#111111' : '#94a3b8' }}
          aria-hidden
        >
          {birthDate ? formatBirthDateDisplay(birthDate) : '選択してください'}
        </div>
        <ChevronDown
          size={20}
          color="#888"
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="date"
          value={birthDate}
          onChange={(e) => {
            setBirthDate(e.target.value);
            setError(null);
          }}
          onClick={openPicker}
          disabled={saving}
          max={new Date().toISOString().slice(0, 10)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
          aria-label="生年月日"
        />
      </div>
    </SignupProfileFieldStep>
  );
}
