import { Suspense } from 'react';
import { PasswordResetPanel } from '@/components/PasswordResetPanel';

export default function PasswordResetPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 md:px-6">
        <div className="w-full max-w-[360px] md:max-w-[720px] py-8">
          <Suspense fallback={<p className="text-center text-[13px] md:text-[16px]" style={{ color: '#AAA' }}>読み込み中…</p>}>
            <PasswordResetPanel />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
