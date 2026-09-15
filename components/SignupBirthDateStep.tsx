'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
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
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  const fieldStyle: CSSProperties = isDark
    ? {
        backgroundColor: '#141414',
        borderColor: '#262626',
        color: birthDate ? '#ffffff' : '#737373',
      }
    : {
        color: birthDate ? '#111111' : '#94a3b8',
      };

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

  const maxBirthDate = new Date().toISOString().slice(0, 10);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input || saving) return;
    input.showPicker?.();
    input.focus();
  };

  const handleBirthDateChange = (value: string) => {
    setBirthDate(value);
    setError(null);
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
      {/* モバイル: iOS/Android では透明 overlay + showPicker が効かないためネイティブ input を表示 */}
      <input
        type="date"
        value={birthDate}
        onChange={(e) => handleBirthDateChange(e.target.value)}
        disabled={saving}
        max={maxBirthDate}
        className="login-email-input md:hidden w-full h-[52px] rounded-2xl px-4 text-[16px] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ ...fieldStyle, colorScheme: isDark ? 'dark' : 'light' }}
        aria-label="生年月日"
      />

      {/* デスクトップ: カスタム表示 + showPicker */}
      <div className="relative hidden md:block">
        <div
          className="login-email-input w-full h-[52px] rounded-2xl px-4 pr-11 text-[15px] text-left flex items-center pointer-events-none"
          style={fieldStyle}
          aria-hidden
        >
          {birthDate ? formatBirthDateDisplay(birthDate) : '選択してください'}
        </div>
        <ChevronDown
          size={20}
          color={isDark ? '#a3a3a3' : '#888'}
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="date"
          value={birthDate}
          onChange={(e) => handleBirthDateChange(e.target.value)}
          onClick={openPicker}
          disabled={saving}
          max={maxBirthDate}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
          aria-label="生年月日"
        />
      </div>
    </SignupProfileFieldStep>
  );
}
