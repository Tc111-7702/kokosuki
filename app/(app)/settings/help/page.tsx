'use client';
import { useSetNavActive } from '@/lib/navActiveStore';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { HelpContent } from '@/components/StaticContents';

export default function SettingsHelpPage() {
  useSetNavActive('mypage');
  const router = useRouter();

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
        <span className="text-[16px] font-black truncate" style={{ color: '#111' }}>ヘルプ・お知らせ</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <HelpContent />
      </div>
    </div>
  );
}
