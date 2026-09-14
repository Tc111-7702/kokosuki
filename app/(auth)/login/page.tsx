'use client';

import { useEffect, useState } from 'react';
import { LoginAccountPickerStep } from '@/components/LoginAccountPickerStep';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';
import { LoginIntroStep } from '@/components/LoginIntroStep';
import { LoginOtpStep } from '@/components/LoginOtpStep';
import { LoginPasswordStep } from '@/components/LoginPasswordStep';
import { LoginSignInStep } from '@/components/LoginSignInStep';
import { LoginSplash } from '@/components/LoginSplash';
import { markLoginSplashSeen, shouldShowLoginSplash } from '@/lib/loginSplash';
import {
  getSavedAccountsForProvider,
  removeLoginAccount,
  type SavedLoginAccount,
} from '@/lib/savedLoginAccounts';

type LoginPhase = 'pending' | 'splash' | 'intro' | 'signin' | 'account-picker' | 'email' | 'otp' | 'password';

const SPLASH_DURATION_MS = 3_000;

export default function LoginPage() {
  const [phase, setPhase] = useState<LoginPhase>('pending');
  const [splashVisible, setSplashVisible] = useState(true);
  const [emailProvider, setEmailProvider] = useState<LoginEmailProvider>('email');
  const [savedAccounts, setSavedAccounts] = useState<SavedLoginAccount[]>([]);
  const [email, setEmail] = useState('');
  const [mailNotice, setMailNotice] = useState<string | null>(null);
  const [quickLoginBusy, setQuickLoginBusy] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldShowLoginSplash()) {
      const introTimer = window.setTimeout(() => setPhase('intro'), 0);
      return () => window.clearTimeout(introTimer);
    }

    const splashTimer = window.setTimeout(() => setPhase('splash'), 0);

    const fadeTimer = window.setTimeout(() => {
      setSplashVisible(false);
    }, SPLASH_DURATION_MS - 500);

    const stepTimer = window.setTimeout(() => {
      markLoginSplashSeen();
      setPhase('intro');
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(splashTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(stepTimer);
    };
  }, []);

  const startQuickLogin = async (account: SavedLoginAccount) => {
    setQuickLoginBusy(true);
    setQuickLoginError(null);
    try {
      const res = await fetch('/api/auth/quick-login/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: account.email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        removeLoginAccount(account.email);
        setSavedAccounts((current) => current.filter((item) => item.email !== account.email));
        await fetch('/api/auth/login/clear-quick-login-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: account.email }),
        }).catch(() => undefined);
        setQuickLoginError(
          typeof data?.message === 'string'
            ? data.message
            : '保存済みアカウントでのログインに失敗しました',
        );
        return;
      }
      window.location.href = '/home';
    } catch {
      setQuickLoginError('保存済みアカウントでのログインに失敗しました');
    } finally {
      setQuickLoginBusy(false);
    }
  };

  const handleSelectProvider = (provider: LoginEmailProvider) => {
    setEmailProvider(provider);
    setQuickLoginError(null);
    if (provider === 'google' || provider === 'apple') {
      const accounts = getSavedAccountsForProvider(provider);
      if (accounts.length > 0) {
        setSavedAccounts(accounts);
        setPhase('account-picker');
        return;
      }
    }
    setPhase('email');
  };

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
          onSelectProvider={handleSelectProvider}
        />
      )}
      {phase === 'account-picker' && (emailProvider === 'google' || emailProvider === 'apple') && (
        <LoginAccountPickerStep
          provider={emailProvider}
          accounts={savedAccounts}
          busy={quickLoginBusy}
          error={quickLoginError}
          onBack={() => setPhase('signin')}
          onSelect={(account) => { void startQuickLogin(account); }}
          onUseOtherAccount={() => setPhase('email')}
        />
      )}
      {phase === 'email' && (
        <LoginEmailStep
          provider={emailProvider}
          onBack={() => {
            if (emailProvider === 'google' || emailProvider === 'apple') {
              const accounts = getSavedAccountsForProvider(emailProvider);
              if (accounts.length > 0) {
                setSavedAccounts(accounts);
                setPhase('account-picker');
                return;
              }
            }
            setPhase('signin');
          }}
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
