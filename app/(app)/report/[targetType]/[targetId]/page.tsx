'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { isReportTargetType } from '@/lib/reportReasons';

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const targetType = String(params.targetType ?? '');
  const targetId = String(params.targetId ?? '');
  const valid = isReportTargetType(targetType) && targetId.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#F7F6F3]">
      <header className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="戻る"
        >
          <ArrowLeft size={20} />
        </button>
      </header>
      <main className="flex-1 overflow-y-auto">
        {!valid && (
          <p className="text-sm text-gray-500 px-4 py-6">通報対象が見つかりません。</p>
        )}
      </main>
    </div>
  );
}
