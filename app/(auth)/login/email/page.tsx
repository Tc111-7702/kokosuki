'use client';

import { useRouter } from 'next/navigation';
import { LoginEmailStep } from '@/components/LoginEmailStep';

// ログイン: メールアドレス入力（OTP送信 or パスワードログインへ分岐）
// Google / Apple は OAuth（/login/signin で signInSocial）に移行したため、ここはメール専用。
export default function LoginEmailPage() {
  const router = useRouter();
  return (
    <LoginEmailStep
      onBack={() => router.push('/login/signin')}
      // メール(PII)を含む notice はクライアントストレージに保存しない。
      // 認証コードページの案内は、サーバーのチケット(HttpOnly)から解決した email で生成する。
      onSent={() => router.push('/login/otp')}
      onPasswordLogin={() => router.push('/login/password')}
    />
  );
}
