import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

function getAuthClientBaseURL(): string {
  // ビルド時固定の NEXT_PUBLIC_APP_URL だと apex/www 不一致で signOut 等が CORS 失敗する
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseURL(),
  plugins: [emailOTPClient()],
});
