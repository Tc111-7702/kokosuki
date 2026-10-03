'use client';
import { useSetNavActive } from '@/lib/navActiveStore';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { useAppTheme } from '@/components/AppThemeProvider';

export default function SettingsDisplayPage() {
  useSetNavActive('mypage');
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';
  const itemBorder = isDark ? '#262626' : '#e5e7eb';

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
        <span className="text-[16px] font-black truncate" style={{ color: '#111' }}>表示</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${itemBorder}` }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] font-bold" style={{ color: '#111' }}>ダークモード</p>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#888' }}>
                未設定時は端末の表示設定に合わせます。
              </p>
            </div>
            <Toggle on={isDark} onClick={toggleTheme} size="sm" ariaLabel="ダークモード" />
          </div>
        </div>
      </div>
    </div>
  );
}
