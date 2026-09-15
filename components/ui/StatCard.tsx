'use client';

import { useSyncExternalStore } from 'react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

export function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const valueColor = accent ?? (isDark ? '#FFFFFF' : '#1A1A1A');

  return (
    <div style={{
      background: isDark ? '#0a0a0a' : '#fff',
      border: isDark ? '1px solid #262626' : 'none',
      borderRadius: 12, padding: '10px 12px',
      boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.06)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 18, fontWeight: 900, margin: '0 0 2px', color: valueColor }}>{value}</p>
      <p style={{ fontSize: 10, color: '#AAA', fontWeight: 600, margin: 0, letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}
