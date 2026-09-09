'use client';

import { ArrowLeft } from 'lucide-react';

/**
 * 設定内のサブ画面を、ページ遷移なしで右からスライド表示するオーバーレイ。
 * 常時DOMに存在し、open で表示/非表示を切り替える（スムーズな開閉のため）。
 */
export function SettingsSheet({
  open,
  onClose,
  title,
  headerRight,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-40 bg-[#FFFFFF] flex flex-col transition-transform duration-300 ease-out"
      style={{
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
    >
      <div
        className="flex-shrink-0 bg-white flex items-center justify-between px-3"
        style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="p-2 active:opacity-60" aria-label="戻る">
            <ArrowLeft size={20} color="#555" />
          </button>
          <h1 className="text-[16px] font-black truncate" style={{ color: '#111' }}>{title}</h1>
        </div>
        {headerRight}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
