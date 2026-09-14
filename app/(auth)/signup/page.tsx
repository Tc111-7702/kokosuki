'use client';

import { useRouter } from 'next/navigation';
import { LoginSignInStep } from '@/components/LoginSignInStep';

export default function SignupPage() {
  const router = useRouter();

  return (
    <LoginSignInStep
      intent="signup"
      onBack={() => router.push('/login')}
      onSelectProvider={() => {
        // サインアップのメール認証ステップは次回実装
      }}
    />
  );
}
