'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { KokosukiLogo } from '@/components/ui/KokosukiLogo';
import loginServiceIntro from '@/components/ui/assets/login-service-intro.png';
import { loginDisplayFont } from '@/lib/loginFonts';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

interface Props {
  onLogin: () => void;
}

export function LoginIntroStep({ onLogin }: Props) {
  const router = useRouter();
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const titleColor = isDark ? '#ffffff' : '#111111';
  const taglineColor = isDark ? '#ffffff' : '#555555';
  const dividerTextColor = isDark ? '#ffffff' : '#111111';
  const dividerLineColor = isDark ? '#ffffff' : '#111111';

  return (
    <div className={`login-intro ${loginDisplayFont.className} flex flex-col items-center min-h-[100dvh] bg-white px-6 py-10 max-md:pt-10 max-md:pb-16`}>
      <div className="w-full max-w-[360px] flex flex-col items-center flex-1 justify-center max-md:flex-none max-md:justify-start max-md:translate-y-4">
        <img
          src={loginServiceIntro.src}
          alt=""
          width={loginServiceIntro.width}
          height={loginServiceIntro.height}
          className="block w-full max-w-[270px] h-auto md:hidden"
        />
        <div className="hidden md:block md:-translate-y-8 shrink-0">
          <KokosukiLogo width={280} />
        </div>

        <div className="login-intro-content w-full flex flex-col items-center">
          <div className="login-intro-text w-full flex flex-col items-center md:-translate-y-10">
            <p className="login-intro-tagline mt-6 md:mt-3 w-full text-center" style={{ color: taglineColor }}>
              あなたの好きが見つかる・広がる
            </p>

            <h1 className="login-intro-title mt-3 w-full text-center" style={{ color: titleColor }}>
              <span className="login-intro-brand">ココスキ</span>
              {' '}へようこそ！
            </h1>
          </div>

          <div className="login-intro-actions w-full max-md:-mx-2 max-md:w-[calc(100%+1rem)] max-md:translate-y-0 md:-mx-8 md:w-[calc(100%+4rem)] md:-translate-y-10">
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="login-intro-primary-btn mt-10 max-md:mt-6 md:mt-6 w-full h-[52px] max-md:h-auto max-md:min-h-[50px] max-md:py-3.5 rounded-2xl max-md:rounded-lg text-[16px] font-bold text-white active:opacity-80"
            >
              はじめての方
            </button>

            <div className="login-intro-divider mt-6 max-md:mt-3 md:mt-3 w-full flex items-center gap-3">
              <span className="login-intro-divider-line flex-1" style={{ backgroundColor: dividerLineColor }} aria-hidden="true" />
              <span className="login-intro-divider-text shrink-0" style={{ color: dividerTextColor }}>登録済みの方はこちら</span>
              <span className="login-intro-divider-line flex-1" style={{ backgroundColor: dividerLineColor }} aria-hidden="true" />
            </div>

            <button
              type="button"
              onClick={onLogin}
              className="login-intro-secondary-btn mt-4 max-md:mt-3 md:mt-3 w-full h-[52px] max-md:h-auto max-md:min-h-[50px] max-md:py-3.5 rounded-2xl max-md:rounded-lg text-[16px] font-bold active:opacity-80"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
