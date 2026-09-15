'use client';

import { useAuthTextColor } from '@/lib/useAuthPrimaryButtonStyle';

interface Props {
  onContinue: () => void;
}

/** 新規登録: ハンドル登録完了（入力ページ上に重ねて表示） */
export function SignupCompleteStep({ onContinue }: Props) {
  const titleColor = useAuthTextColor();

  return (
    <div
      className="signup-app-font font-sans fixed inset-0 z-50 flex items-center justify-center px-6 py-8 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-complete-title"
    >
      <div
        className="w-full max-w-[360px] md:max-w-[520px] rounded-2xl bg-white px-6 py-8 md:px-10 md:py-10 text-center"
        style={{ border: '1.5px solid #EDE9D8' }}
      >
        <h1
          id="signup-complete-title"
          className="text-[18px] md:text-[22px] font-black leading-snug"
          style={{ color: titleColor }}
        >
          登録が完了しました！
        </h1>
        <p className="mt-4 text-[11px] md:text-[15px] leading-relaxed text-[#888888]">
          ココスキへようこそ！
          <br />
          あなたの好きをたくさん見つけましょう！
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="login-otp-send-btn mt-8 w-full h-[52px] rounded-2xl text-[16px] font-bold text-white active:opacity-80"
        >
          OK
        </button>
      </div>
    </div>
  );
}
