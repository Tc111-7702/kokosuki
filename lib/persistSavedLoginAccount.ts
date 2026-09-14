import { authClient } from '@/lib/auth-client';
import {
  isSavedLoginProviderEmail,
  removeLoginAccount,
  saveLoginAccount,
} from '@/lib/savedLoginAccounts';

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

/** Gmail / iCloud の保存済みアカウント情報と即ログイン Cookie を削除 */
export async function clearSavedLoginAccount(email: string): Promise<void> {
  if (!isSavedLoginProviderEmail(email)) return;

  removeLoginAccount(email);

  try {
    await fetch('/api/auth/login/clear-quick-login-cookie', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    /* 削除失敗時も退会処理は続行 */
  }
}

export async function persistSavedLoginAccount(email: string): Promise<void> {
  if (!isSavedLoginProviderEmail(email)) return;

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
