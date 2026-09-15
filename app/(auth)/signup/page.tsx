'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoginAccountPickerStep } from '@/components/LoginAccountPickerStep';
import { LoginEmailStep, type LoginEmailProvider } from '@/components/LoginEmailStep';
import { LoginOtpStep } from '@/components/LoginOtpStep';
import { LoginSignInStep } from '@/components/LoginSignInStep';
import { SignupFeatureIntroStep } from '@/components/SignupFeatureIntroStep';
import { SignupGachaSelectStep } from '@/components/SignupGachaSelectStep';
import { SignupIpSelectStep } from '@/components/SignupIpSelectStep';
import { SignupBirthDateStep } from '@/components/SignupBirthDateStep';
import { SignupHandleStep } from '@/components/SignupHandleStep';
import { SignupNicknameStep } from '@/components/SignupNicknameStep';
import { SignupPasswordStep } from '@/components/SignupPasswordStep';
import { SignupProfileIntroStep } from '@/components/SignupProfileIntroStep';
import { cancelSignupPending } from '@/lib/signupPendingCancel';
import type { SignupPendingCancelStep } from '@/lib/signupPendingTypes';
import {
  getSavedAccountsForProvider,
  removeLoginAccount,
  type SavedLoginAccount,
} from '@/lib/savedLoginAccounts';

type SignupPhase =
  | 'ip-select'
  | 'gacha-select'
  | 'feature-intro'
  | 'signin'
  | 'account-picker'
  | 'email'
  | 'otp'
  | 'password'
  | 'profile-intro'
  | 'name'
  | 'birthDate'
  | 'handle';

export default function SignupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SignupPhase>('ip-select');
  const [selectedIpNames, setSelectedIpNames] = useState<string[]>([]);
  const [favoriteGachaIds, setFavoriteGachaIds] = useState<string[]>([]);
  const [emailProvider, setEmailProvider] = useState<LoginEmailProvider>('email');
  const [savedAccounts, setSavedAccounts] = useState<SavedLoginAccount[]>([]);
  const [email, setEmail] = useState('');
  const [mailNotice, setMailNotice] = useState<string | null>(null);
  const [quickLoginBusy, setQuickLoginBusy] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null);
  const [featureIntroStep, setFeatureIntroStep] = useState(0);

  const handleSignupBack = async (fromStep: SignupPendingCancelStep, nextPhase: SignupPhase) => {
    await cancelSignupPending(fromStep);
    setPhase(nextPhase);
  };

  const handleSignupSessionExpired = () => {
    setPhase('email');
  };

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

  return (
    <>
      {phase === 'ip-select' && (
        <SignupIpSelectStep
          onBack={() => router.push('/login')}
          onContinue={(ips) => {
            setSelectedIpNames(ips);
            setPhase('gacha-select');
          }}
        />
      )}
      {phase === 'gacha-select' && (
        <SignupGachaSelectStep
          selectedIpNames={selectedIpNames}
          favoriteGachaIds={favoriteGachaIds}
          onFavoriteGachaIdsChange={setFavoriteGachaIds}
          onBack={() => {
            setFavoriteGachaIds([]);
            setPhase('ip-select');
          }}
          onContinue={() => {
            setFeatureIntroStep(0);
            setPhase('feature-intro');
          }}
        />
      )}
      {phase === 'feature-intro' && (
        <SignupFeatureIntroStep
          key={featureIntroStep}
          initialStep={featureIntroStep}
          onBack={() => setPhase('gacha-select')}
          onComplete={() => setPhase('signin')}
        />
      )}
      {phase === 'signin' && (
        <LoginSignInStep
          intent="signup"
          onBack={() => {
            setFeatureIntroStep(2);
            setPhase('feature-intro');
          }}
          onSelectProvider={handleSelectProvider}
        />
      )}
      {phase === 'account-picker' && (emailProvider === 'google' || emailProvider === 'apple') && (
        <LoginAccountPickerStep
          provider={emailProvider}
          accounts={savedAccounts}
          busy={quickLoginBusy}
          error={quickLoginError}
          appFont
          onBack={() => setPhase('signin')}
          onSelect={(account) => { void startQuickLogin(account); }}
          onUseOtherAccount={() => setPhase('email')}
        />
      )}
      {phase === 'email' && (
        <LoginEmailStep
          flow="signup"
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
        />
      )}
      {phase === 'otp' && (
        <LoginOtpStep
          flow="signup"
          email={email}
          initialMailNotice={mailNotice}
          onBack={() => { void handleSignupBack('otp', 'email'); }}
          onSessionExpired={handleSignupSessionExpired}
          onVerified={(verifiedEmail) => {
            setEmail(verifiedEmail);
            setPhase('password');
          }}
        />
      )}
      {phase === 'password' && (
        <SignupPasswordStep
          onBack={() => { void handleSignupBack('password', 'otp'); }}
          onContinue={() => setPhase('profile-intro')}
          onSessionExpired={handleSignupSessionExpired}
        />
      )}
      {phase === 'profile-intro' && (
        <SignupProfileIntroStep
          onBack={() => setPhase('password')}
          onContinue={() => setPhase('name')}
          onSessionExpired={handleSignupSessionExpired}
        />
      )}
      {phase === 'name' && (
        <SignupNicknameStep
          onBack={() => { void handleSignupBack('name', 'profile-intro'); }}
          onContinue={() => setPhase('birthDate')}
          onSessionExpired={handleSignupSessionExpired}
        />
      )}
      {phase === 'birthDate' && (
        <SignupBirthDateStep
          onBack={() => { void handleSignupBack('birthDate', 'name'); }}
          onContinue={() => setPhase('handle')}
          onSessionExpired={handleSignupSessionExpired}
        />
      )}
      {phase === 'handle' && (
        <SignupHandleStep
          email={email}
          favoriteGachaIds={favoriteGachaIds}
          onBack={() => { void handleSignupBack('handle', 'birthDate'); }}
          onSessionExpired={handleSignupSessionExpired}
        />
      )}
    </>
  );
}
