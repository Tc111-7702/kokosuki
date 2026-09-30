'use client';

import { useRouter } from 'next/navigation';
import { LoginOtpStep } from '@/components/LoginOtpStep';
import { useSignupStepGuard } from '@/hooks/useSignupStepGuard';

// 新規登録: 認証コード入力。pending（メール送信済み）が無ければ /signup/email、
// お気に入り無効なら /signup へ。email は touch が返す pending から取得。
export default function SignupOtpPage() {
  const router = useRouter();
  const { ready, pending } = useSignupStepGuard({ requireFavorites: true, requirePending: true });

  if (!ready || !pending) return <div className="min-h-screen bg-white" aria-busy="true" />;

  return (
    <LoginOtpStep
      flow="signup"
      email={pending.email}
      initialMailNotice={`${pending.email} に認証コードを送信しました`}
      onBack={() => router.push('/signup/email')}
      onSessionExpired={() => router.replace('/signup/email')}
      onVerified={() => router.push('/signup/password')}
    />
  );
}
