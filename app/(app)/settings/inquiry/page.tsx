'use client';
import { useSetNavActive } from '@/lib/navActiveStore';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { InquiryForm } from '@/components/InquiryForm';

export default function InquiryPage() {
  useSetNavActive('mypage');
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-[#F7F6F3]">
      <header className="flex items-center gap-2 px-4 md:px-10 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="戻る"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-black text-gray-900">お問い合わせ</h1>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <InquiryForm />
      </main>
    </div>
  );
}
