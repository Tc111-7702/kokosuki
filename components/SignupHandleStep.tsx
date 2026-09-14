'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { SignupProfileFieldStep } from '@/components/SignupProfileFieldStep';
import {
  HANDLE_FORMAT_ERROR,
  isSignupHandleFormatValid,
  normalizeSignupHandleInput,
} from '@/lib/signupHandle';
import { SignupCompleteStep } from '@/components/SignupCompleteStep';
import { persistSavedLoginAccount } from '@/lib/persistSavedLoginAccount';
import {
  isSignupPendingSessionExpiredResponse,
  redirectOnSignupPendingExpired,
} from '@/lib/useSignupPendingExpiry';

interface Props {
  email: string;
  favoriteGachaIds: string[];
  onBack: () => void;
  onSessionExpired: () => void;
}

type HandleStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid';

/** 新規登録: ユーザーID入力 */
export function SignupHandleStep({ email, favoriteGachaIds, onBack, onSessionExpired }: Props) {
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const handleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHandleRef = useRef('');

  useEffect(() => () => {
    if (handleDebounce.current) clearTimeout(handleDebounce.current);
  }, []);

  const trimmed = handle.trim();
  const formatValid = isSignupHandleFormatValid(trimmed);
  const canSubmit = formatValid && handleStatus === 'ok' && !saving;

  const checkHandleAvailability = (next: string) => {
    latestHandleRef.current = next;
    if (handleDebounce.current) clearTimeout(handleDebounce.current);

    if (!next) {
      setHandleStatus('idle');
      return;
    }
    if (!isSignupHandleFormatValid(next)) {
      setHandleStatus('invalid');
      return;
    }

    setHandleStatus('checking');
    handleDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/handle-available?handle=${encodeURIComponent(next)}`);
        const data = await res.json().catch(() => null);
        if (latestHandleRef.current !== next) return;
        if (!res.ok || data?.available === false) {
          setHandleStatus(data?.reason === 'invalid' ? 'invalid' : 'taken');
          return;
        }
        setHandleStatus('ok');
      } catch {
        if (latestHandleRef.current === next) setHandleStatus('idle');
      }
    }, 400);
  };

  const handleInput = (value: string) => {
    const next = normalizeSignupHandleInput(value);
    setHandle(next);
    setError(null);
    checkHandleAvailability(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      const patchRes = await fetch('/api/auth/signup/pending', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ handle: trimmed }),
      });
      const patchData = await patchRes.json().catch(() => null);
      if (!patchRes.ok) {
        if (isSignupPendingSessionExpiredResponse(patchRes)) {
          await redirectOnSignupPendingExpired(onSessionExpired);
          return;
        }
        setError(typeof patchData?.error === 'string' ? patchData.error : 'ユーザーIDの保存に失敗しました');
        return;
      }

      const completeRes = await fetch('/api/auth/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ favoriteGachaIds }),
      });
      const completeData = await completeRes.json().catch(() => null);
      if (!completeRes.ok) {
        if (isSignupPendingSessionExpiredResponse(completeRes)) {
          await redirectOnSignupPendingExpired(onSessionExpired);
          return;
        }
        setError(typeof completeData?.error === 'string' ? completeData.error : 'アカウントの作成に失敗しました');
        return;
      }
      await persistSavedLoginAccount(email);
      setCompleteOpen(true);
    } catch {
      setError('アカウントの作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <SignupProfileFieldStep
      step={3}
      title="ユーザーID"
      description="このIDでユーザーを検索することができるようになります。30日間は変更できません。"
      submitLabel="アカウントを作成する"
      busyLabel="作成中…"
      canSubmit={canSubmit}
      busy={saving}
      error={error}
      onBack={onBack}
      onSubmit={handleSubmit}
      onSessionExpired={onSessionExpired}
    >
      <div className="relative overflow-visible">
        <p className="pointer-events-none absolute right-1 bottom-full mb-1 hidden text-[12px] text-[#94a3b8] md:block">
          4-20字・半角英数字
        </p>
        {handleStatus === 'taken' ? (
          <p
            className="pointer-events-none absolute left-1 bottom-full mb-1 hidden max-w-[calc(100%-8rem)] text-left text-[12px] font-bold md:block"
            style={{ color: '#C4483C' }}
          >
            このユーザーIDはすでに使われています
          </p>
        ) : null}
        {handleStatus === 'invalid' && trimmed ? (
          <p
            className="pointer-events-none absolute left-1 bottom-full mb-1 hidden max-w-[calc(100%-8rem)] text-left text-[12px] font-bold md:block"
            style={{ color: '#C4483C' }}
          >
            {HANDLE_FORMAT_ERROR}
          </p>
        ) : null}
        <input
          type="text"
          value={handle}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="ユーザーID"
          disabled={saving}
          autoComplete="username"
          maxLength={20}
          className="login-email-input w-full h-[52px] rounded-2xl px-4 pr-11 text-[14px] md:text-[15px] outline-none disabled:opacity-50"
          style={{ borderColor: formatValid && handleStatus === 'ok' ? '#FFCD31' : undefined }}
        />
        {handle && handleStatus !== 'ok' ? (
          <button
            type="button"
            onClick={() => handleInput('')}
            disabled={saving}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60 disabled:opacity-50"
            style={{ background: '#E8E8E8' }}
            aria-label="入力をクリア"
          >
            <X size={14} color="#888" strokeWidth={2.5} />
          </button>
        ) : null}
        {handleStatus === 'ok' ? (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#22c55e' }}
            aria-hidden
          >
            <Check size={16} color="#fff" strokeWidth={3} />
          </span>
        ) : null}
      </div>

      <p className="text-[11px] md:text-[12px] text-[#94a3b8] -mt-2 px-1 md:hidden">
        4-20字・半角英数字
      </p>
      {handleStatus === 'taken' ? (
        <p className="text-[12px] md:text-[13px] font-bold -mt-2 text-center w-full md:hidden" style={{ color: '#C4483C' }}>
          このユーザーIDはすでに使われています
        </p>
      ) : null}
      {handleStatus === 'invalid' && trimmed ? (
        <p className="text-[12px] md:text-[13px] font-bold -mt-2 text-center w-full md:hidden" style={{ color: '#C4483C' }}>
          {HANDLE_FORMAT_ERROR}
        </p>
      ) : null}
    </SignupProfileFieldStep>
    {completeOpen ? (
      <SignupCompleteStep onContinue={() => {
        window.location.href = '/home';
      }} />
    ) : null}
    </>
  );
}
