'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /mypage → ログイン中ユーザーの /mypage/[userId] へ置き換え遷移
export default function MyPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.id) router.replace(`/mypage/${d.user.id}`);
        else router.replace('/login');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full bg-[#FFFEEF]">
      <p className="text-[13px]" style={{ color: '#AAA' }}>読み込み中…</p>
    </div>
  );
}
