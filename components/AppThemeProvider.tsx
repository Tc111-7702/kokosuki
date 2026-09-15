'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { applyTheme, type AppTheme } from '@/lib/appTheme';
import {
  getThemeSnapshot,
  setAppTheme,
  subscribeTheme,
  toggleAppTheme,
} from '@/lib/appThemeStore';

type AppThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<AppTheme>(subscribeTheme, getThemeSnapshot, () => 'light');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    setAppTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    toggleAppTheme(getThemeSnapshot());
  }, []);

  return (
    <AppThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
