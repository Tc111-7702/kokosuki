'use client';

import { useEffect } from 'react';
import { markLoginFromLogout } from '@/lib/loginSplash';
import { signOutAndClearSession } from '@/lib/signOutClient';

// (app) 配下の全ページ共通のセッションガード。
// サーバー側のセッションが失われたら（BAN でのセッション削除・期限切れ・別端末でのログアウト等）
// /login へ誘導する。
//
// 方針: 固定ポーリングはせず、
//   1) マウント時・タブ表示復帰(visibilitychange/focus)時に /api/me で確認
//   2) 通常のAPI呼び出しが 401 を返したら、その場でセッション無効とみなす（実トラフィックに便乗）
// のイベント駆動で検知する。
//
// 注意: proxy.ts はセッションCookieの「有無」だけでログイン判定し、Cookie があると /login を
// /home へ跳ね返す。そのため単に /login へ遷移するだけでは戻される。
// ここでは signOut() で Cookie を破棄してから、フルナビゲーションで /login へ遷移する。
export function SessionGuard() {
  useEffect(() => {
    let redirecting = false;

    // セッション無効時の共通処理: Cookie を消してから /login へ
    const handleInvalid = async () => {
      if (redirecting) return;
      redirecting = true;
      await signOutAndClearSession();
      markLoginFromLogout();
      window.location.href = '/login';
    };

    // /api/me は未ログインでも 200 で { user: null } を返す仕様
    const checkMe = async () => {
      if (redirecting) return;
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) return; // 一時的なサーバーエラー等は誤ログアウトを避けて無視
        const data = await res.json();
        if (!data?.user) handleInvalid();
      } catch {
        // ネットワーク断は無視（オフラインで誤ってログアウトさせない）
      }
    };

    // ── 401 インターセプト ──
    // 同一オリジンの API 呼び出し（/api/auth/* を除く）が 401 を返したら、セッション無効の疑い。
    // ただし即追放はしない。一時的な DB エラー等でも 401 が返り得るため、必ず checkMe() で
    // /api/me に確認し、本当にセッションが無い（200 かつ user:null）ときだけ追放する。
    // これにより「一時エラーで複数ブラウザが同時追放される」誤爆を防ぐ。
    const origFetch = window.fetch;
    const isGuardedApi = (url: string): boolean => {
      try {
        const u = new URL(url, window.location.origin);
        return u.origin === window.location.origin
          && u.pathname.startsWith('/api/')
          && !u.pathname.startsWith('/api/auth/');
      } catch {
        return false;
      }
    };
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const res = await origFetch(input, init);
      try {
        if (res.status === 401) {
          const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
          if (isGuardedApi(url)) void checkMe(); // 即追放せず /api/me で確認してから
        }
      } catch { /* 判定失敗は無視 */ }
      return res;
    };
    window.fetch = patchedFetch;

    checkMe(); // マウント時に一度

    // タブに戻ってきた / ウィンドウにフォーカスした瞬間に確認（離席復帰で素早く反映）
    const onActive = () => { if (document.visibilityState === 'visible') checkMe(); };
    document.addEventListener('visibilitychange', onActive);
    window.addEventListener('focus', onActive);

    return () => {
      // 自分が差し込んだ場合のみ元に戻す（他で差し替えられていたら触らない）
      if (window.fetch === patchedFetch) window.fetch = origFetch;
      document.removeEventListener('visibilitychange', onActive);
      window.removeEventListener('focus', onActive);
    };
  }, []);

  return null;
}
