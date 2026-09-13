'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { PasswordChangePanel } from '@/components/PasswordChangePanel';

type ProfileSummary = {
  email: string;
  userId: string;
};

export default function SettingsPasswordPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSummary | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/mypage/summary').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/me').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([summary, me]) => {
        if (!alive) return;
        const userId = typeof me?.user?.id === 'string' ? me.user.id : null;
        const email = typeof summary?.email === 'string' ? summary.email : '';
        if (!userId) {
          setProfile(null);
          return;
        }
        setProfile({ userId, email });
      })
      .catch(() => {
        if (alive) setProfile(null);
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
        <span className="text-[16px] font-black truncate" style={{ color: '#111' }}>パスワード設定</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden scrollbar-hide p-4 md:p-0 flex flex-col items-center md:justify-center">
        <div className="w-full max-w-[360px] md:max-w-[720px] py-4 md:py-0">
          {profile === undefined ? (
            <p className="py-12 text-center text-[13px] md:text-[16px]" style={{ color: '#AAA' }}>読み込み中…</p>
          ) : profile === null ? (
            <p className="py-12 text-center text-[13px] md:text-[16px]" style={{ color: '#AAA' }}>プロフィールを取得できませんでした</p>
          ) : (
            <PasswordChangePanel userId={profile.userId} email={profile.email} />
          )}
        </div>
      </div>
    </div>
  );
}
