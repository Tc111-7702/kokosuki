'use client';

import { useState } from 'react';
import { formatMailDeliveryNotice } from '@/lib/mailDeliveryNotice';
import type { MailDeliveryResult } from '@/lib/mail';
import {
  emailFieldClass,
  emailSendButtonClass,
  emailFieldStyle,
  emailFormGroupClass,
  emailLabelClass,
  emailErrorClass,
  emailPanelClass,
  emailPrimaryButtonStyle,
} from '@/components/emailChangeLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailChangePanel({
  initialEmail,
  onSent,
}: {
  initialEmail: string;
  onSent: (newEmail: string, notice?: string) => void;
}) {
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSendVerificationEmail = async () => {
    const trimmed = emailDraft.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setEmailError('有効なメールアドレスを入力してください');
      return;
    }
    if (trimmed === initialEmail.trim()) {
      setEmailError('現在と異なるメールアドレスを入力してください');
      return;
    }
    setEmailError(null);
    setSending(true);
    try {
      const res = await fetch('/api/profile/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEmailError(typeof data?.error === 'string' ? data.error : '認証メールの送信に失敗しました');
        return;
      }
      const notice = formatMailDeliveryNotice(
        data?.mail as MailDeliveryResult | undefined,
        trimmed,
        `${trimmed} に認証コードを送信しました`,
      );
      onSent(trimmed, notice);
    } catch {
      setEmailError('認証メールの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className={emailPanelClass}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSendVerificationEmail();
      }}
    >
      <div className={`${emailFormGroupClass} md:gap-1.5`}>
        <label className={emailLabelClass} style={{ color: '#888' }}>現在のメールアドレス</label>
        <p className="text-[14px] md:text-[18px] font-bold truncate max-w-full text-left md:text-center w-full" style={{ color: initialEmail.trim() ? '#111' : '#AAA' }}>
          {initialEmail.trim() || '未設定'}
        </p>
      </div>
      <div className={emailFormGroupClass}>
        <label className={emailLabelClass} style={{ color: '#888' }}>新しいメールアドレス</label>
        <input
          type="email"
          value={emailDraft}
          onChange={(e) => { setEmailDraft(e.target.value); setEmailError(null); }}
          placeholder="example@email.com"
          disabled={sending}
          className={`${emailFieldClass} h-11 md:h-[52px] disabled:opacity-50`}
          style={emailFieldStyle}
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className={emailSendButtonClass}
        style={emailPrimaryButtonStyle(!sending)}
      >
        {sending ? '送信中…' : '認証メールを送信してメールアドレスを登録する'}
      </button>
      {emailError ? (
        <p className={emailErrorClass} style={{ color: '#C4483C' }}>{emailError}</p>
      ) : null}
    </form>
  );
}
