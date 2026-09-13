'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  emailBodyClass,
  emailButtonClass,
  emailPanelClass,
} from '@/components/emailChangeLayout';

export function PasswordResetCompletePanel() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    let redirectTimer: number | undefined;
    void authClient.getSession().then(({ data }) => {
      if (!alive) return;
      const session = !!data?.session;
      setHasSession(session);
      if (!session) {
        redirectTimer = window.setTimeout(() => {
          if (alive) router.replace('/login');
        }, 1500);
      }
    });
    return () => {
      alive = false;
      if (redirectTimer !== undefined) window.clearTimeout(redirectTimer);
    };
  }, [router]);

  if (hasSession === null) {
    return (
      <p className="py-12 text-center text-[13px] md:text-[16px]" style={{ color: '#AAA' }}>読み込み中…</p>
    );
  }

  return (
    <div className={emailPanelClass}>
      <p className="text-[15px] md:text-[20px] font-black text-left md:text-center" style={{ color: '#111' }}>
        パスワードの変更が完了しました
      </p>
      {hasSession ? (
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className={emailButtonClass}
          style={{ background: '#F2B800', color: '#111' }}
        >
          設定にもどる
        </button>
      ) : (
        <p className={emailBodyClass} style={{ color: '#666' }}>ログイン画面へ移動します…</p>
      )}
    </div>
  );
}
