'use client';

import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

// (app) 配下の全ページ共通のセッションガード。
// サーバー側のセッションが失われたら（BAN でのセッション削除・期限切れ・別端末でのログアウト等）
// /login へ誘導する。マウント時・タブ表示復帰時・一定間隔で /api/me を確認する。
//
// 注意: proxy.ts はセッションCookieの「有無」だけでログイン判定し、Cookie があると /login を
// /home へ跳ね返す。そのため単に /login へ遷移するだけでは戻されてしまう。
// ここでは signOut() で Cookie を破棄してから、フルナビゲーションで /login へ遷移する。
export function SessionGuard() {
  useEffect(() => {
    let alive = true;
    let redirecting = false;

    const check = async () => {
      if (redirecting) return;
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) return; // 一時的なサーバーエラー等は誤ログアウトを避けて無視
        const data = await res.json();
        if (!alive || data?.user) return; // まだ有効なら何もしない

        // セッション無効: Cookie を消してから /login へ（proxy が Cookie 有無で判定するため）
        redirecting = true;
        await authClient.signOut().catch(() => {});
        window.location.href = '/login';
      } catch {
        // ネットワーク断は無視（オフラインで誤ってログアウトさせない）
      }
    };

    check(); // マウント時に一度

    // 表示中のみ 30 秒ごとに確認（非表示タブでは無駄打ちしない）
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') check();
    }, 30_000);

    // タブに戻ってきた / ウィンドウにフォーカスした瞬間にも確認（BAN 後の離席復帰で素早く反映）
    const onActive = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onActive);
    window.addEventListener('focus', onActive);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onActive);
      window.removeEventListener('focus', onActive);
    };
  }, []);

  return null;
}
