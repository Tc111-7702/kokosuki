'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';
import { LOGIN_OTP_NOTICE_KEY } from '@/lib/loginFlowClient';

function LoginEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerParam = searchParams.get('provider');
  const provider: LoginEmailProvider =
    providerParam === 'google' || providerParam === 'apple' ? providerParam : 'email';

  return (
    <LoginEmailStep
      provider={provider}
      onBack={() => router.push('/login/signin')}
      onSent={(_email, notice) => {
        // 認証コードページで表示する配信案内を同タブで受け渡す（サーバーのチケットで遷移可否は担保）。
        try {
          if (notice) sessionStorage.setItem(LOGIN_OTP_NOTICE_KEY, notice);
          else sessionStorage.removeItem(LOGIN_OTP_NOTICE_KEY);
        } catch {
          /* sessionStorage 不可時は案内なしで続行 */
        }
        router.push('/login/otp');
      }}
      onPasswordLogin={() => router.push('/login/password')}
    />
  );
}

// ログイン: メールアドレス入力（OTP送信 or パスワードログインへ分岐）
export default function LoginEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" aria-busy="true" />}>
      <LoginEmailInner />
    </Suspense>
  );
}
