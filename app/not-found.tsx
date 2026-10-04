'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

export default function NotFound() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  useEffect(() => {
    let alive = true;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setHasSession(!!d?.user?.id); })
      .catch(() => { if (alive) setHasSession(false); });
    return () => { alive = false; };
  }, []);

  const nextHref = hasSession ? '/' : '/login';
  const nextLabel = hasSession ? 'ホームへ' : 'ログインへ';

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(nextHref);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center"
      style={{ background: isDark ? '#0a0a0a' : '#F7F6F3' }}
    >
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: 1, color: '#F2B800' }}>404</p>
      <h1 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 900, color: isDark ? '#FFFFFF' : '#1a1a1a' }}>
        ページが見つかりません
      </h1>
      <p
        className="not-found-lead"
        style={{ margin: '10px 0 0', maxWidth: 320, fontSize: 13, lineHeight: 1.6, color: isDark ? '#A3A3A3' : '#888' }}
      >
        アドレスが間違っているか、ページが移動した可能性があります
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="not-found-back rounded-full px-5 py-2.5 text-[14px] font-bold"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={() => router.push(nextHref)}
          className="not-found-next rounded-full px-5 py-2.5 text-[14px] font-bold"
        >
          {hasSession === null ? '…' : nextLabel}
        </button>
      </div>
      <style>{`
        .not-found-back {
          background: #9CA3AF !important;
          color: #fff !important;
          border: none;
          cursor: pointer;
        }
        html.dark .not-found-back {
          background: #525252 !important;
        }
        .not-found-next {
          background: #F2B800 !important;
          color: #fff !important;
          border: none;
          cursor: pointer;
        }
        .not-found-lead {
          text-align: center;
        }
        @media (max-width: 767px) {
          .not-found-lead {
            width: min(320px, 100%);
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
