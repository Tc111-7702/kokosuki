'use client';

import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

export function authPrimaryButtonStyle(isDark: boolean, enabled: boolean): CSSProperties {
  if (enabled) {
    return { backgroundColor: '#f2b800', color: '#ffffff', opacity: 1 };
  }
  return isDark
    ? { backgroundColor: '#2a2a2a', color: '#737373', opacity: 1 }
    : { backgroundColor: '#e5e1d0', color: '#ffffff', opacity: 1 };
}

export function useAuthPrimaryButtonStyle(enabled: boolean): CSSProperties {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  return authPrimaryButtonStyle(isDark, enabled);
}

function useAuthIsDark(): boolean {
  return useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
}

export function useAuthBackIconColor(): string {
  return useAuthIsDark() ? '#ffffff' : '#111111';
}

/** 見出し・タイトル（ダーク: 白 / ライト: #111111） */
export function useAuthTextColor(): string {
  return useAuthIsDark() ? '#ffffff' : '#111111';
}

/** admin の --admin-text-muted と同じ（注意書き・デスクトップ戻るリンク） */
export function useAuthMutedTextColor(): string {
  return useAuthIsDark() ? '#a3a3a3' : '#64748b';
}

/** コードを再送・パスワードをお忘れですか？リンク（admin の login-otp-resend と同じ） */
export function useAuthResendLinkColor(disabled: boolean): string {
  const isDark = useAuthIsDark();
  if (disabled) return isDark ? '#737373' : '#94a3b8';
  return isDark ? '#ffffff' : '#111111';
}
