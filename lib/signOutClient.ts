import { authClient } from '@/lib/auth-client';

/** クライアントからログアウト。signOut 失敗時は同一オリジンの clear-session API で Cookie を削除する */
export async function signOutAndClearSession(): Promise<void> {
  try {
    const result = await authClient.signOut();
    if (result && 'error' in result && result.error) {
      throw result.error;
    }
    return;
  } catch {
    /* signOut が CORS / ネットワーク等で失敗した場合のフォールバック */
  }

  try {
    await fetch('/api/auth/clear-session', { method: 'POST', credentials: 'include' });
  } catch {
    /* 退会 API 等でサーバー側削除済みの場合もある */
  }
}
