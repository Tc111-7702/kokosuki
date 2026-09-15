'use client';

import { useSyncExternalStore } from 'react';
import { ChevronLeft, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { SavedLoginAccount } from '@/lib/savedLoginAccounts';
import { useAuthBackIconColor, useAuthMutedTextColor } from '@/lib/useAuthPrimaryButtonStyle';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

const PROVIDER_LABEL: Record<'google' | 'apple', string> = {
  google: 'Google',
  apple: 'Apple',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

interface Props {
  provider: 'google' | 'apple';
  accounts: SavedLoginAccount[];
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onSelect: (account: SavedLoginAccount) => void;
  onUseOtherAccount: () => void;
  /** サインアップフローでは通常フォント */
  appFont?: boolean;
}

export function LoginAccountPickerStep({
  provider,
  accounts,
  busy = false,
  error = null,
  onBack,
  onSelect,
  onUseOtherAccount,
  appFont = false,
}: Props) {
  const backIconColor = useAuthBackIconColor();
  const backLinkColor = useAuthMutedTextColor();
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const pageBg = isDark ? '#0a0a0a' : undefined;
  const cardStyle = isDark
    ? { backgroundColor: '#0a0a0a', borderColor: '#262626', boxShadow: 'none' }
    : undefined;
  const rowStyle = isDark ? { backgroundColor: '#0a0a0a', borderColor: '#262626' } : undefined;
  const titleColor = isDark ? '#ffffff' : undefined;
  const bodyColor = isDark ? '#a3a3a3' : undefined;
  const nameColor = isDark ? '#ffffff' : undefined;
  const fontClass = appFont ? 'signup-app-font font-sans' : '';
  const providerLabel = PROVIDER_LABEL[provider];
  const ProviderIcon = provider === 'google' ? GoogleIcon : AppleIcon;

  return (
    <div
      className={`login-account-picker flex flex-col min-h-[100dvh] w-full ${fontClass}`}
      style={pageBg ? { backgroundColor: pageBg } : undefined}
    >
      <div
        className="login-account-picker-shell flex flex-col min-h-[100dvh] w-full px-4 py-6 md:px-6 md:py-10"
        style={pageBg ? { backgroundColor: pageBg } : undefined}
      >
        <div className="login-account-picker-inner w-full max-w-[448px] mx-auto flex flex-col flex-1 min-h-0 min-w-0">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="self-start -ml-1 mb-4 p-1 active:opacity-60 disabled:opacity-50 md:hidden"
            aria-label="戻る"
          >
            <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
          </button>

          <div
            className="login-account-picker-card w-full min-w-0 bg-white overflow-hidden flex flex-col md:flex-1 md:min-h-0"
            style={cardStyle}
          >
            <div className="login-account-picker-header px-6 pt-6 pb-5 flex flex-col w-full text-left md:text-center">
              <div
                className="login-account-picker-provider flex items-center gap-2.5 w-full md:justify-center"
                style={bodyColor ? { color: bodyColor } : undefined}
              >
                <ProviderIcon />
                <span>{`${providerLabel} でログイン`}</span>
              </div>

              <h1 className="login-account-picker-title mt-5 w-full" style={titleColor ? { color: titleColor } : undefined}>
                アカウントを選択してください
              </h1>

              <p
                className="login-account-picker-subtitle mt-3 w-full leading-relaxed px-1"
                style={bodyColor ? { color: bodyColor } : undefined}
              >
                この端末でログインしたことのあるアカウントを選択してください
              </p>
            </div>

            <div
              className="login-account-picker-list border-t w-full min-w-0"
              style={rowStyle ? { borderColor: rowStyle.borderColor } : undefined}
              aria-busy={busy}
            >
              {accounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={busy}
                  onClick={() => onSelect(account)}
                  className="login-account-picker-row w-full flex items-center gap-4 px-6 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  style={rowStyle}
                >
                  <Avatar
                    user={{ name: account.name, image: account.avatarUrl }}
                    size={40}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="login-account-picker-name block truncate"
                      style={nameColor ? { color: nameColor } : undefined}
                    >
                      {account.name}
                    </span>
                    <span
                      className="login-account-picker-email block truncate mt-0.5"
                      style={bodyColor ? { color: bodyColor } : undefined}
                    >
                      {account.email}
                    </span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={onUseOtherAccount}
                disabled={busy}
                className="login-account-picker-row login-account-picker-row-other w-full flex items-center gap-4 px-6 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                style={rowStyle}
              >
                <span
                  className="login-account-picker-other-icon flex items-center justify-center shrink-0"
                  style={bodyColor ? { color: bodyColor } : undefined}
                >
                  <UserRound size={22} strokeWidth={1.75} />
                </span>
                <span className="login-account-picker-name" style={nameColor ? { color: nameColor } : undefined}>
                  別のアカウントを使用する
                </span>
              </button>
            </div>

            {error ? (
              <p className="login-account-picker-error px-6 py-3 text-[13px] font-bold border-t">
                {error}
              </p>
            ) : null}

            <div
              className="login-account-picker-footer px-6 py-5 border-t md:mt-auto w-full shrink-0 flex flex-col text-left md:text-center"
              style={rowStyle ? { borderColor: rowStyle.borderColor } : undefined}
            >
              <p
                className="login-account-picker-notice w-full leading-relaxed px-1"
                style={bodyColor ? { color: bodyColor } : undefined}
              >
                続行すると、ココスキの利用規約とプライバシーポリシーが適用されます。
              </p>

              <button
                type="button"
                onClick={onBack}
                disabled={busy}
                className="login-email-back-link hidden md:block w-full mt-3 disabled:opacity-50"
                style={{ color: backLinkColor }}
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
