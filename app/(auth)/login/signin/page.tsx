'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { LoginSignInStep, type LoginSignInProvider } from '@/components/LoginSignInStep';
import { useAuthTextColor } from '@/hooks/useAuthPrimaryButtonStyle';

// ログイン: プロバイダ選択（Google / Apple / メール）
// Google はログイン専用。未登録アカウントが選ばれると better-auth 側で作成をブロックし、
// errorCallbackURL 経由で ?error=signup_disabled を付けて戻ってくるので、
// それを検知して「登録されていません」カードを表示する（新規登録完了と同じカード形式）。
function LoginSignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const titleColor = useAuthTextColor();
  // 到着時に一度だけ判定（?error=signup_disabled でカードを開く）。
  const [notRegisteredOpen, setNotRegisteredOpen] = useState(
    () => searchParams.get('error') === 'signup_disabled',
  );

  const handleSelectProvider = (provider: LoginSignInProvider) => {
    if (provider === 'google') {
      // 成功（既存ユーザー）→ /home へ即時ログイン。未登録 → /login/signin?error=signup_disabled。
      void authClient.signIn.social({
        provider: 'google',
        callbackURL: '/home',
        errorCallbackURL: '/login/signin',
      });
      return;
    }
    router.push(`/login/email?provider=${provider}`);
  };

  const closeNotRegistered = () => {
    setNotRegisteredOpen(false);
    // URL から error を除去（リロードでの再表示を防ぐ）。
    router.replace('/login/signin');
  };

  return (
    <>
      <LoginSignInStep
        onBack={() => router.push('/login')}
        onSelectProvider={handleSelectProvider}
      />
      {notRegisteredOpen ? (
        <div
          className="font-sans fixed inset-0 z-50 flex items-center justify-center px-6 py-8 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-not-registered-title"
        >
          <div
            className="w-full max-w-[360px] md:max-w-[520px] rounded-2xl bg-white px-6 py-8 md:px-10 md:py-10 text-center"
            style={{ border: '1.5px solid #EDE9D8' }}
          >
            <h1
              id="login-not-registered-title"
              className="text-[18px] md:text-[22px] font-black leading-snug"
              style={{ color: titleColor }}
            >
              このGoogleアカウントは
              <br />
              登録されていません
            </h1>
            <p className="mt-4 text-[11px] md:text-[15px] leading-relaxed text-[#888888]">
              新規登録がお済みでない場合は、
              <br />
              新規登録してください。
            </p>
            <button
              type="button"
              onClick={closeNotRegistered}
              className="login-otp-send-btn mt-8 w-full h-[52px] rounded-2xl text-[16px] font-bold text-white active:opacity-80"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function LoginSignInPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen" style={{ backgroundColor: '#fffbf0' }} aria-busy="true" />}
    >
      <LoginSignInInner />
    </Suspense>
  );
}
