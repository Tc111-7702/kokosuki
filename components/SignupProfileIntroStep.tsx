'use client';

import { ChevronLeft } from 'lucide-react';
import { PasswordResetCompleteIllustration } from '@/components/ui/PasswordResetCompleteIllustration';
import { useSignupPendingExpiry } from '@/lib/useSignupPendingExpiry';
import { useAuthBackIconColor, useAuthMutedTextColor, useAuthTextColor } from '@/lib/useAuthPrimaryButtonStyle';

interface Props {
  onBack: () => void;
  onContinue: () => void;
  onSessionExpired: () => void;
}

/** 新規登録: パスワード設定後のプロフィール作成イントロ */
export function SignupProfileIntroStep({ onBack, onContinue, onSessionExpired }: Props) {
  useSignupPendingExpiry(onSessionExpired);
  const backIconColor = useAuthBackIconColor();
  const backLinkColor = useAuthMutedTextColor();
  const titleColor = useAuthTextColor();

  return (
    <div
      className="signup-profile-intro signup-app-font font-sans flex flex-col min-h-[100dvh] bg-white px-6 pt-4 pb-8"
    >
      <div className="w-full max-w-[360px] md:max-w-[400px] mx-auto flex flex-col flex-1 min-h-0">
        <button
          type="button"
          onClick={onBack}
          className="self-start -ml-1 p-1 active:opacity-60 md:hidden"
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
        </button>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center">
          <PasswordResetCompleteIllustration
            width={200}
            className="w-[140px] md:w-[200px]"
          />

          <h1
            className="mt-8 text-[19px] md:text-[22px] font-black leading-snug"
            style={{ color: titleColor }}
          >
            プロフィールをつくろう！
          </h1>
          <p
            className="mt-3 text-[12px] md:text-[13px] font-bold leading-relaxed px-1"
            style={{ color: 'var(--app-text-muted)' }}
          >
            ココスキで使う基本情報を一緒に設定しましょう
          </p>
        </div>

        <div className="w-full shrink-0 flex flex-col gap-4 max-md:-translate-y-4">
          <button
            type="button"
            onClick={onContinue}
            className="login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80"
          >
            次へ
          </button>
          <button
            type="button"
            onClick={onBack}
            className="login-email-back-link hidden md:block w-full"
            style={{ color: backLinkColor }}
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
