'use client';

import { useSyncExternalStore } from 'react';
import { Heart } from 'lucide-react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

function useIsDark() {
  return useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
}

export function TrendingSection({ title, children }: { title: string; children: React.ReactNode }) {
  const isDark = useIsDark();
  const shellBorder = isDark ? '#262626' : '#e5e7eb';

  return (
    <div style={{
      background: isDark ? '#0a0a0a' : '#fff',
      border: `1px solid ${shellBorder}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${shellBorder}` }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#FFFFFF' : '#111' }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function TrendingRow({ rank, avatar, title, subtitle, likeCount, onClick, isLast = false }: {
  rank: number; avatar: React.ReactNode; title: string; subtitle?: string; likeCount: number; onClick?: () => void; isLast?: boolean;
}) {
  const isDark = useIsDark();
  const shellBorder = isDark ? '#262626' : '#e5e7eb';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.06)' : '#fafaf8';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.12s',
        borderBottom: isLast ? 'none' : `1px solid ${shellBorder}`,
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = hoverBg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <span style={{ width: 18, fontSize: 13, fontWeight: 700, color: '#FBBF24', flexShrink: 0, textAlign: 'center' }}>
        {rank}
      </span>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#FFFFFF' : '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: isDark ? '#737373' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <Heart size={12} color="#F87171" fill="#F87171" />
        <span style={{ fontSize: 12, color: isDark ? '#737373' : '#888' }}>{likeCount.toLocaleString()}</span>
      </div>
    </div>
  );
}
