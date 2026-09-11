'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ReportSubmitSuccessProps = {
  title?: string;
};

/** 通報・問い合わせ送信完了後、上から被さるサンクス画面 */
export function ReportSubmitSuccess({
  title = 'ご協力ありがとうございました',
}: ReportSubmitSuccessProps) {
  const router = useRouter();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#F7F6F3] ' +
        'transition-transform duration-500 ease-out ' +
        (entered ? 'translate-y-0' : '-translate-y-full')
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-success-title"
    >
      <p id="report-success-title" className="text-xl font-black text-gray-900">
        {title}
      </p>
      <button
        type="button"
        onClick={() => router.back()}
        className="min-w-[200px] px-8 py-3 rounded-full text-[15px] font-black bg-[#F2B800] text-white hover:bg-[#E0A800] active:opacity-90 transition-colors"
      >
        ミッケに戻る
      </button>
    </div>
  );
}
