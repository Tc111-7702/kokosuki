'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/** 設定内の静的テキストページ共通レイアウト */
export function StaticTextPage({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white flex items-center gap-2 px-3" style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={() => router.back()} className="p-2 active:opacity-60" aria-label="戻る">
          <ArrowLeft size={20} color="#555" />
        </button>
        <h1 className="text-[16px] font-black" style={{ color: '#111' }}>{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="text-[13px] leading-relaxed" style={{ color: '#555' }}>{children}</div>
      </div>
    </div>
  );
}
