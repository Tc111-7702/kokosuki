'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginOtpStep } from '@/components/LoginOtpStep';
import { LOGIN_OTP_NOTICE_KEY } from '@/lib/loginFlowClient';

// 認証コード入力の実体。email/provider はサーバーがチケットから解決して渡す
// （URL に個人情報を載せない）。認証成功時の /home 遷移は LoginOtpStep 内で行う。
export function LoginOtpPageClient({ email, provider }: { email: string; provider: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(LOGIN_OTP_NOTICE_KEY);
      if (stored) {
        setNotice(stored);
        sessionStorage.removeItem(LOGIN_OTP_NOTICE_KEY);
      }
    } catch {
      /* sessionStorage 不可時は案内なし */
    }
  }, []);

  return (
    <LoginOtpStep
      email={email}
      initialMailNotice={notice}
      onBack={() => router.push(`/login/email?provider=${provider}`)}
    />
  );
}
