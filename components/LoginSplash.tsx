'use client';

import passwordResetComplete from '@/components/ui/assets/password-reset-complete.svg';

export function LoginSplash({ visible }: { visible: boolean }) {
  const desktopIllustrationWidth = 280;

  return (
    <div
      className="login-splash fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#ffcd31] px-6 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center translate-y-8">
        <img
          src={passwordResetComplete.src}
          alt=""
          width={desktopIllustrationWidth}
          height={Math.round(
            desktopIllustrationWidth * (passwordResetComplete.height / passwordResetComplete.width),
          )}
          className="login-splash-image block w-[130px] md:w-[280px] h-auto -translate-y-10"
          style={{ objectFit: 'contain' }}
        />
        <p className="login-splash-title login-splash-title-position">ココスキ</p>
      </div>
    </div>
  );
}
