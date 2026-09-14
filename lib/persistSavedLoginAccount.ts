import { authClient } from '@/lib/auth-client';
import { saveLoginAccount } from '@/lib/savedLoginAccounts';

async function registerQuickLoginCookie(): Promise<void> {
  try {
    await fetch('/api/auth/login/register-quick-token', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    /* cookie 保存失敗時も表示用アカウント情報は保存する */
  }
}

export async function persistSavedLoginAccount(email: string): Promise<void> {
  await registerQuickLoginCookie();

  try {
    const { data } = await authClient.getSession();
    saveLoginAccount({
      email,
      name: data?.user?.name?.trim() || email.split('@')[0] || 'ユーザー',
      avatarUrl: data?.user?.image ?? null,
    });
  } catch {
    saveLoginAccount({
      email,
      name: email.split('@')[0] || 'ユーザー',
      avatarUrl: null,
    });
  }
}
