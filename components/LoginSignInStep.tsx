'use client';

import { useSyncExternalStore } from 'react';
import { ChevronLeft, Mail } from 'lucide-react';
import { KokosukiLogo } from '@/components/ui/KokosukiLogo';
import { loginDisplayFont } from '@/lib/loginFonts';
import { useAuthBackIconColor } from '@/lib/useAuthPrimaryButtonStyle';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

export type LoginSignInProvider = 'google' | 'apple' | 'email';

interface Props {
  onBack: () => void;
  onSelectProvider: (provider: LoginSignInProvider) => void;
  intent?: 'login' | 'signup';
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function LoginSignInStep({ onBack, onSelectProvider, intent = 'login' }: Props) {
  const backIconColor = useAuthBackIconColor();
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const pageBg = isDark ? '#0a0a0a' : '#fffbf0';
  const taglineColor = isDark ? '#ffffff' : '#111111';
  const appleBtnStyle = isDark
    ? { backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }
    : undefined;
  const actionLabel = intent === 'signup' ? '新規登録' : '続ける';
  const fontClass = intent === 'signup' ? 'signup-app-font font-sans' : loginDisplayFont.className;

  return (
    <div
      className={`login-signin ${fontClass} flex flex-col min-h-[100dvh] px-6`}
      style={{ backgroundColor: pageBg }}
    >
      <div className="login-signin-inner w-full mx-auto flex flex-col flex-1">
        <header className="login-signin-header relative flex flex-col items-center pt-10 max-md:pt-8 w-full">
          <button
            type="button"
            onClick={onBack}
            className="login-signin-back absolute -left-1 top-8 max-md:top-6 p-1 active:opacity-60"
            aria-label="戻る"
          >
            <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
          </button>
          <div className="login-signin-logo">
            <KokosukiLogo width={180} />
          </div>
        </header>

        <div className="login-signin-below-logo flex flex-col items-center w-full flex-1 max-md:flex-none">
          <div className="login-signin-tagline-wrap flex-1 max-md:flex-none flex items-center justify-center py-8 max-md:py-0 w-full">
            <p className="login-signin-tagline w-full text-center" style={{ color: taglineColor }}>
              あなたの「好き」が
              <br />
              見つかる。つながる。もっと推せる。
            </p>
          </div>

          <div className="login-signin-actions flex flex-col gap-3 pb-10 max-md:pb-0 w-full">
            <button
              type="button"
              onClick={() => onSelectProvider('google')}
              className="login-signin-btn login-signin-btn-google"
            >
              <GoogleIcon />
              <span>{`Googleで${actionLabel}`}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectProvider('apple')}
              className="login-signin-btn login-signin-btn-apple"
              style={appleBtnStyle}
            >
              <AppleIcon className="shrink-0" style={isDark ? { color: '#000000' } : undefined} />
              <span style={isDark ? { color: '#000000' } : undefined}>{`Appleで${actionLabel}`}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectProvider('email')}
              className={`login-signin-btn login-signin-btn-email${intent === 'signup' ? ' login-signin-btn-email-signup' : ''}`}
            >
              <Mail size={20} strokeWidth={2.25} className="login-signin-btn-email-icon shrink-0" />
              <span>{`メールアドレスで${actionLabel}`}</span>
            </button>
          </div>

          <p
            className="login-signin-notice mt-5 pb-8 w-full leading-relaxed px-1 max-md:block md:hidden"
            style={{ color: '#999999', textAlign: 'left' }}
          >
            新規登録またはログインで、ココスキの利用規約とプライバシーポリシーに同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
}
