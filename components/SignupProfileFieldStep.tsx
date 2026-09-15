'use client';

import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SignupProfileProgress } from '@/components/SignupProfileProgress';
import { PasswordResetCompleteIllustration } from '@/components/ui/PasswordResetCompleteIllustration';
import { useSignupPendingExpiry } from '@/lib/useSignupPendingExpiry';
import { useAuthBackIconColor, useAuthMutedTextColor, useAuthPrimaryButtonStyle, useAuthTextColor } from '@/lib/useAuthPrimaryButtonStyle';

interface Props {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  submitLabel: string;
  busyLabel?: string;
  canSubmit: boolean;
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onSubmit: () => void;
  children: ReactNode;
  footer?: ReactNode;
  submitButtonClassName?: string;
  onSessionExpired: () => void;
}

/** 新規登録: プロフィール入力（ニックネーム / 生年月日 / ユーザーID）共通レイアウト */
export function SignupProfileFieldStep({
  step,
  title,
  description,
  submitLabel,
  busyLabel = '保存中…',
  canSubmit,
  busy = false,
  error = null,
  onBack,
  onSubmit,
  children,
  footer,
  submitButtonClassName = 'max-md:translate-y-2',
  onSessionExpired,
}: Props) {
  useSignupPendingExpiry(onSessionExpired);
  const submitStyle = useAuthPrimaryButtonStyle(canSubmit);
  const backIconColor = useAuthBackIconColor();
  const backLinkColor = useAuthMutedTextColor();
  const titleColor = useAuthTextColor();

  return (
    <div
      className="signup-profile-field-step signup-app-font font-sans flex flex-col min-h-[100dvh] bg-white px-6 pt-4 pb-8"
    >
      <div className="w-full max-w-[360px] md:max-w-[400px] mx-auto flex flex-col flex-1 min-h-0 md:translate-y-6">
        <div className="shrink-0">
          <div className="mt-4 flex items-center gap-3 md:mt-0 md:justify-start">
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="-ml-1 p-1 active:opacity-60 disabled:opacity-50 md:hidden shrink-0"
              aria-label="戻る"
            >
              <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
            </button>
            <SignupProfileProgress step={step} />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full">
          <PasswordResetCompleteIllustration
            width={200}
            className="w-[140px] md:w-[200px]"
          />

          <h1
            className="mt-6 text-[19px] md:text-[22px] font-black text-center leading-snug w-full"
            style={{ color: titleColor }}
          >
            {title}
          </h1>

          <p
            className="mt-3 text-[12px] md:text-[13px] text-left leading-relaxed px-1 w-full"
            style={{ color: 'var(--app-text-muted)' }}
          >
            {description}
          </p>

          <form
            className="mt-6 w-full flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            {children}

            {error ? (
              <p className="text-[12px] md:text-[13px] font-bold -mt-1 text-center w-full" style={{ color: '#C4483C' }}>
                {error}
              </p>
            ) : null}

            {footer}

            <button
              type="submit"
              disabled={!canSubmit}
              style={submitStyle}
              className={`login-otp-send-btn w-full h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed ${submitButtonClassName}`}
            >
              {busy ? busyLabel : submitLabel}
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="login-email-back-link hidden md:block w-full disabled:opacity-50"
              style={{ color: backLinkColor }}
            >
              戻る
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
