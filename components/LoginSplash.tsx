'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import passwordResetComplete from '@/components/ui/assets/password-reset-complete.svg';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

const SPLASH_DURATION_MS = 3_000;
const DESKTOP_ILLUSTRATION_WIDTH = 280;

type LoginSplashProps = {
  onFinish: () => void;
};

export function LoginSplash({ onFinish }: LoginSplashProps) {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const splashBg = isDark ? '#0a0a0a' : '#ffcd31';
  const [visible, setVisible] = useState(true);
  const countdownStartedRef = useRef(false);
  const timersRef = useRef<{ fade: number; finish: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const startCountdown = useCallback(() => {
    if (countdownStartedRef.current) return;
    countdownStartedRef.current = true;

    const fadeTimer = window.setTimeout(() => {
      setVisible(false);
    }, SPLASH_DURATION_MS - 500);

    const finishTimer = window.setTimeout(() => {
      onFinish();
    }, SPLASH_DURATION_MS);

    timersRef.current = { fade: fadeTimer, finish: finishTimer };
  }, [onFinish]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      startCountdown();
    }

    return () => {
      const timers = timersRef.current;
      if (!timers) return;
      window.clearTimeout(timers.fade);
      window.clearTimeout(timers.finish);
    };
  }, [startCountdown]);

  return (
    <div
      className="login-splash fixed inset-0 z-50 flex flex-col items-center justify-center px-6 transition-opacity duration-500"
      style={{
        backgroundColor: splashBg,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center translate-y-8">
        <img
          ref={imgRef}
          src={passwordResetComplete.src}
          alt=""
          width={DESKTOP_ILLUSTRATION_WIDTH}
          height={Math.round(
            DESKTOP_ILLUSTRATION_WIDTH
              * (passwordResetComplete.height / passwordResetComplete.width),
          )}
          className="login-splash-image block w-[130px] md:w-[280px] h-auto -translate-y-10"
          style={{ objectFit: 'contain' }}
          onLoad={startCountdown}
          onError={startCountdown}
        />
        <p className="login-splash-title login-splash-title-position">ココスキ</p>
      </div>
    </div>
  );
}
