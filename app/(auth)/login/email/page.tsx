'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';

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
      // メール(PII)を含む notice はクライアントストレージに保存しない。
      // 認証コードページの案内は、サーバーのチケット(HttpOnly)から解決した email で生成する。
      onSent={() => router.push('/login/otp')}
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
