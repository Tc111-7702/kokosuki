'use client';

import { useEffect, useState } from 'react';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';
import { LoginIntroStep } from '@/components/LoginIntroStep';
import { LoginOtpStep } from '@/components/LoginOtpStep';
import { LoginPasswordStep } from '@/components/LoginPasswordStep';
import { LoginSignInStep } from '@/components/LoginSignInStep';
import { LoginSplash } from '@/components/LoginSplash';
import { markLoginSplashSeen, shouldShowLoginSplash } from '@/lib/loginSplash';
import { clearSignupPendingSession } from '@/lib/signupPendingCancel';

type LoginPhase = 'pending' | 'splash' | 'intro' | 'signin' | 'email' | 'otp' | 'password';

export default function LoginPage() {
  const [phase, setPhase] = useState<LoginPhase>('pending');
  const [emailProvider, setEmailProvider] = useState<LoginEmailProvider>('email');
  const [email, setEmail] = useState('');
  const [mailNotice, setMailNotice] = useState<string | null>(null);

  useEffect(() => {
    const clearPending = () => {
      void clearSignupPendingSession();
    };

    clearPending();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) clearPending();
    };
    window.addEventListener('pageshow', onPageShow);

    if (!shouldShowLoginSplash()) {
      const introTimer = window.setTimeout(() => setPhase('intro'), 0);
      return () => {
        window.clearTimeout(introTimer);
        window.removeEventListener('pageshow', onPageShow);
      };
    }

    const splashTimer = window.setTimeout(() => setPhase('splash'), 0);

    return () => {
      window.clearTimeout(splashTimer);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const handleSelectProvider = (provider: LoginEmailProvider) => {
    setEmailProvider(provider);
    setPhase('email');
  };

  if (phase === 'pending') {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  return (
    <>
      {phase === 'splash' && (
        <LoginSplash
          onFinish={() => {
            markLoginSplashSeen();
            setPhase('intro');
          }}
        />
      )}
      {phase === 'intro' && (
        <LoginIntroStep onLogin={() => setPhase('signin')} />
      )}
      {phase === 'signin' && (
        <LoginSignInStep
          onBack={() => setPhase('intro')}
          onSelectProvider={handleSelectProvider}
        />
      )}
      {phase === 'email' && (
        <LoginEmailStep
          provider={emailProvider}
          onBack={() => setPhase('signin')}
          onSent={(sentEmail, notice) => {
            setEmail(sentEmail);
            setMailNotice(notice ?? null);
            setPhase('otp');
          }}
          onPasswordLogin={(verifiedEmail) => {
            setEmail(verifiedEmail);
            setPhase('password');
          }}
        />
      )}
      {phase === 'otp' && (
        <LoginOtpStep
          email={email}
          initialMailNotice={mailNotice}
          onBack={() => setPhase('email')}
        />
      )}
      {phase === 'password' && (
        <LoginPasswordStep
          email={email}
          onBack={() => setPhase('email')}
        />
      )}
    </>
  );
}
