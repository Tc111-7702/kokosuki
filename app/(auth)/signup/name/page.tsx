'use client';

import { useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SignupProfileFieldStep } from '@/components/SignupProfileFieldStep';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import {
  isSignupPendingSessionExpiredResponse,
  redirectOnSignupPendingExpired,
} from '@/hooks/useSignupPendingExpiry';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

const NAME_MAX = 30;

// 新規登録: ニックネーム入力（旧 SignupNicknameStep を直書き）。
export default function SignupNamePage() {
  const router = useRouter();
  const onBack = () => router.push('/signup/profile-intro');
  const onContinue = () => router.push('/signup/birthdate');
  const onSessionExpired = () => router.replace('/signup/email');

  const { ready } = useSignupStepGuard({
    requireFavorites: true,
    requirePending: true,
    requireFields: ['emailVerified', 'password'],
  });
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= NAME_MAX && !saving;
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const clearBtnBg = isDark ? '#1a1a1a' : '#E8E8E8';
  const clearBtnIcon = isDark ? '#a3a3a3' : '#888888';

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

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

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
          aria-labelledby="signup-profile-field-title"
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
            style={{ background: clearBtnBg }}
            aria-label="入力をクリア"
          >
            <X size={14} color={clearBtnIcon} strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </SignupProfileFieldStep>
  );
}
