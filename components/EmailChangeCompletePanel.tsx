'use client';

import { useRouter } from 'next/navigation';
import { emailButtonClass, emailPanelClass } from '@/components/emailChangeLayout';

export function EmailChangeCompletePanel({ newEmail }: { newEmail: string }) {
  const router = useRouter();

  return (
    <div className={emailPanelClass}>
      <div
        className="rounded-2xl px-3 md:px-4 py-4 md:py-6 w-full"
        style={{ background: '#F7F6F3', border: '1.5px solid #EDE9D8' }}
      >
        <p className="text-[15px] md:text-[20px] font-black md:whitespace-nowrap text-left md:text-center" style={{ color: '#111' }}>
          メールアドレスの変更が完了しました
        </p>
        <p className="text-[13px] md:text-[15px] mt-2 md:mt-3 md:whitespace-nowrap text-left md:text-center" style={{ color: '#666' }}>新しいメールアドレス</p>
        <p className="text-[15px] md:text-[18px] font-bold md:whitespace-nowrap text-left md:text-center" style={{ color: '#111' }}>{newEmail}</p>
      </div>
      <button
        type="button"
        onClick={() => router.push('/settings')}
        className={emailButtonClass}
        style={{ background: '#F2B800', color: '#111' }}
      >
        設定にもどる
      </button>
    </div>
  );
}
