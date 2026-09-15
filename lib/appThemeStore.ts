import {
  applyTheme,
  getSystemTheme,
  resolveTheme,
  setTheme as persistTheme,
  THEME_STORAGE_KEY,
  type AppTheme,
} from '@/lib/appTheme';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getThemeSnapshot(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  return resolveTheme();
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    applyTheme(getSystemTheme());
    emit();
  };
  mq.addEventListener('change', onSystemChange);

  return () => {
    listeners.delete(onStoreChange);
    mq.removeEventListener('change', onSystemChange);
  };
}

export function setAppTheme(theme: AppTheme): void {
  persistTheme(theme);
  emit();
}

export function toggleAppTheme(current: AppTheme): void {
  setAppTheme(current === 'dark' ? 'light' : 'dark');
}
