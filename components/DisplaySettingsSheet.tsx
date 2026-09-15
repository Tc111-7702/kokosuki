'use client';

import { SettingsSheet } from '@/components/SettingsSheet';
import { Toggle } from '@/components/ui/Toggle';
import { useAppTheme } from '@/components/AppThemeProvider';

export function DisplaySettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';
  const itemBorder = isDark ? '#262626' : '#e5e7eb';

  return (
    <SettingsSheet open={open} onClose={onClose} title="表示">
      <div className="px-4 py-4" style={{ borderBottom: `1px solid ${itemBorder}` }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-bold" style={{ color: '#111' }}>ダークモード</p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#888' }}>
              未設定時は端末の表示設定に合わせます。
            </p>
          </div>
          <Toggle
            on={isDark}
            onClick={toggleTheme}
            size="sm"
            ariaLabel="ダークモード"
          />
        </div>
      </div>
    </SettingsSheet>
  );
}
