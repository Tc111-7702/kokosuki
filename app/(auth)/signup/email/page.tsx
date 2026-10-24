'use client';

import { useRouter } from 'next/navigation';
import { LoginEmailStep } from '@/components/LoginEmailStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: メールアドレス入力（OTP送信）。お気に入り無効なら /signup へ。
// Google / Apple は OAuth（/signup/signin で start へリダイレクト）に移行したため、ここはメール専用。
export default function SignupEmailPage() {
  const router = useRouter();
  const { ready } = useSignupStepGuard({ requireFavorites: true });

  if (!ready) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <LoginEmailStep
      flow="signup"
      onBack={() => router.push('/signup/signin')}
      // 案内文(email含む)は保持せず、OTPページで pending の email から再生成する。
      onSent={() => router.push('/signup/otp')}
    />
  );
}
