'use client';

import { useEffect, useState } from 'react';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';
import { LoginIntroStep } from '@/components/LoginIntroStep';
import { LoginOtpStep } from '@/components/LoginOtpStep';
import { LoginPasswordStep } from '@/components/LoginPasswordStep';
import { LoginSignInStep } from '@/components/LoginSignInStep';
import { LoginSplash } from '@/components/LoginSplash';
import { markLoginSplashSeen, shouldShowLoginSplash } from '@/lib/loginSplash';

type LoginPhase = 'pending' | 'splash' | 'intro' | 'signin' | 'email' | 'otp' | 'password';

const SPLASH_DURATION_MS = 3_000;

export default function LoginPage() {
  const [phase, setPhase] = useState<LoginPhase>('pending');
  const [splashVisible, setSplashVisible] = useState(true);
  const [emailProvider, setEmailProvider] = useState<LoginEmailProvider>('email');
  const [email, setEmail] = useState('');
  const [mailNotice, setMailNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldShowLoginSplash()) {
      setPhase('intro');
      return;
    }

    setPhase('splash');

    const fadeTimer = window.setTimeout(() => {
      setSplashVisible(false);
    }, SPLASH_DURATION_MS - 500);

    const stepTimer = window.setTimeout(() => {
      markLoginSplashSeen();
      setPhase('intro');
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(stepTimer);
    };
  }, []);

  if (phase === 'pending') {
    return <div className="min-h-screen bg-white" aria-busy="true" />;
  }

  return (
    <>
      {phase === 'splash' && <LoginSplash visible={splashVisible} />}
      {phase === 'intro' && (
        <LoginIntroStep onLogin={() => setPhase('signin')} />
      )}
      {phase === 'signin' && (
        <LoginSignInStep
          onBack={() => setPhase('intro')}
          onSelectProvider={(provider) => {
            setEmailProvider(provider);
            setPhase('email');
          }}
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
