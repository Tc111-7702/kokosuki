'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasValidSignupFavorites, touchSignupFavorites } from '@/lib/signupFavorites';

// signup 各ページ冒頭のガード＋期限スライド更新。
// - お気に入り（sessionStorage）が無効 → /signup（IP選択）へ（最優先）。
// - pending（token＋累積入力）が無効 → /signup/email へ。
// - 有効なら token / お気に入りの期限を延長し ready=true。
// 実際の本登録はサーバー(complete)でも検証するため、これは UX ガード。

export type SignupPendingField = 'emailVerified' | 'password' | 'name' | 'birthDate';

export interface SignupPendingPublic {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  name: string | null;
  birthDate: string | null;
  handle: string | null;
}

interface Options {
  /** お気に入り（IP選択済み）を必須にするか（既定 true）。 */
  requireFavorites?: boolean;
  /** pending token＋累積入力を検証し、期限を延長するか（メール以降のページで true）。 */
  requirePending?: boolean;
  /** pending に必須の累積項目。 */
  requireFields?: SignupPendingField[];
}

export function useSignupStepGuard(
  opts: Options = {},
): { ready: boolean; pending: SignupPendingPublic | null } {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<SignupPendingPublic | null>(null);

  useEffect(() => {
    const { requireFavorites = true, requirePending = false, requireFields = [] } = opts;

    // setState をエフェクト同期で呼ばないようタイマー経由にする（react-hooks/set-state-in-effect 回避）。
    const timer = window.setTimeout(() => {
      void (async () => {
        // 1) お気に入り（最優先）
        if (requireFavorites) {
          if (!hasValidSignupFavorites()) {
            router.replace('/signup');
            return;
          }
          touchSignupFavorites();
        }

        // 2) pending（token＋累積入力）＋期限延長
        if (!requirePending) {
          setReady(true);
          return;
        }
        try {
          const res = await fetch('/api/auth/signup/touch', {
            method: 'POST',
            credentials: 'include',
          });
          if (!res.ok) {
            router.replace('/signup/email');
            return;
          }
          const data = (await res.json()) as SignupPendingPublic;
          const ok = requireFields.every((f) => {
            if (f === 'emailVerified') return data.emailVerified === true;
            if (f === 'password') return data.hasPassword === true;
            if (f === 'name') return !!data.name;
            if (f === 'birthDate') return !!data.birthDate;
            return true;
          });
          if (!ok) {
            router.replace('/signup/email');
            return;
          }
          setPending(data);
          setReady(true);
        } catch {
          router.replace('/signup/email');
        }
      })();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready, pending };
}
