'use client';
import { useSetNavActive } from '@/lib/navActiveStore';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { PrivacyContent } from '@/components/StaticContents';

// 遷移元(from)に応じた戻り先。signup/login は同意文のある signin 画面、既定は設定。
function backHref(from: string | null): string {
  if (from === 'signup') return '/signup/signin';
  if (from === 'login') return '/login/signin';
  return '/settings';
}

function PrivacyInner() {
  useSetNavActive('mypage');
  const router = useRouter();
  const from = useSearchParams().get('from');

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}
      >
        <button
          type="button"
          onClick={() => router.push(backHref(from))}
          className="flex items-center gap-1 text-[14px] font-bold px-2 py-1.5 rounded-lg active:opacity-70"
          style={{ color: '#555' }}
        >
          <ChevronLeft size={20} />
          もどる
        </button>
        <span className="text-[16px] font-black truncate" style={{ color: '#111' }}>プライバシーポリシー</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <PrivacyContent />
      </div>
    </div>
  );
}

export default function SettingsPrivacyPage() {
  return (
    <Suspense fallback={<div className="h-full bg-white" aria-busy="true" />}>
      <PrivacyInner />
    </Suspense>
  );
}
