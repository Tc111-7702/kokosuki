'use client';
import { useSetNavActive } from '@/lib/navActiveStore';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { EmailPasswordPanel } from '@/components/EmailPasswordPanel';
import { EmailChangePanel } from '@/components/EmailChangePanel';
import { EmailOtpPanel } from '@/components/EmailOtpPanel';
import { EmailChangeCompletePanel } from '@/components/EmailChangeCompletePanel';

export default function SettingsEmailPage() {
  useSetNavActive('mypage');
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [pendingEmail, setPendingEmail] = useState('');
  const [mailNotice, setMailNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/mypage/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setEmail(typeof d?.email === 'string' ? d.email : null);
        setProfileName(typeof d?.name === 'string' ? d.name : '');
        setProfileAvatarUrl(typeof d?.avatarUrl === 'string' ? d.avatarUrl : null);
      })
      .catch(() => {
        if (alive) setEmail(null);
      });
    return () => { alive = false; };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}
      >
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="flex items-center gap-1 text-[14px] font-bold px-2 py-1.5 rounded-lg active:opacity-70"
          style={{ color: '#555' }}
        >
          <ChevronLeft size={20} />
          もどる
        </button>
        <span className="text-[16px] font-black truncate" style={{ color: '#111' }}>メールアドレス設定</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-[360px] md:max-w-[720px] py-4 md:py-8">
          {email === undefined ? (
            <p className="py-12 text-center text-[13px] md:text-[16px]" style={{ color: '#AAA' }}>読み込み中…</p>
          ) : email === null ? (
            <p className="py-12 text-center text-[13px] md:text-[16px]" style={{ color: '#AAA' }}>メールアドレスを取得できませんでした</p>
          ) : step === 1 ? (
            <EmailPasswordPanel onVerified={() => setStep(2)} />
          ) : step === 2 ? (
            <EmailChangePanel
              initialEmail={email}
              onSent={(newEmail, notice) => {
                setPendingEmail(newEmail);
                setMailNotice(notice ?? null);
                setStep(3);
              }}
            />
          ) : step === 3 ? (
            <EmailOtpPanel
              newEmail={pendingEmail}
              initialMailNotice={mailNotice}
              onVerified={() => setStep(4)}
            />
          ) : (
            <EmailChangeCompletePanel
              oldEmail={email}
              newEmail={pendingEmail}
              name={profileName}
              avatarUrl={profileAvatarUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
