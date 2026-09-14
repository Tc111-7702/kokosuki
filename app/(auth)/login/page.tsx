'use client';

import { useEffect, useState } from 'react';
import { LoginIntroStep } from '@/components/LoginIntroStep';
import { LoginSignInStep } from '@/components/LoginSignInStep';
import { LoginSplash } from '@/components/LoginSplash';
import { markLoginSplashSeen, shouldShowLoginSplash } from '@/lib/loginSplash';

type LoginPhase = 'pending' | 'splash' | 'intro' | 'signin';

const SPLASH_DURATION_MS = 3_000;

export default function LoginPage() {
  const [phase, setPhase] = useState<LoginPhase>('pending');
  const [splashVisible, setSplashVisible] = useState(true);

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
        <LoginSignInStep onBack={() => setPhase('intro')} />
      )}
    </>
  );
}
