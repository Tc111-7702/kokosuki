'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /mypage → ログイン中ユーザーの /mypage/[userId] へ置き換え遷移
export default function MyPageRedirect() {
  const router = useRouter();

  // 一時的な 503 / ネットワーク失敗ではログインへ飛ばさずリトライする。
  // 本当に未ログイン（200 かつ user:null）のときだけ /login へ。
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = (attempt: number) => {
      fetch('/api/me')
        .then(async (r) => {
          if (!alive) return;
          if (r.ok) {
            const d = await r.json();
            if (d?.user?.id) router.replace(`/mypage/${d.user.id}`);
            else router.replace('/login'); // 本当に未ログイン
            return;
          }
          // 503 等の一時エラー: リトライ、尽きたら /login
          if (attempt < 5) timer = setTimeout(() => load(attempt + 1), 500);
          else router.replace('/login');
        })
        .catch(() => {
          if (!alive) return;
          if (attempt < 5) timer = setTimeout(() => load(attempt + 1), 500);
          else router.replace('/login');
        });
    };
    load(0);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full bg-[#FFFFFF]">
      <p className="text-[13px]" style={{ color: '#AAA' }}>読み込み中…</p>
    </div>
  );
}
