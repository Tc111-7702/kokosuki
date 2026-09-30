'use client';

import { useEffect, useState } from 'react';

// モジュールキャッシュ（成功IDのみ保持しセッション中の再取得を省く。null/undefinedは保持しない）
let cachedId: string | null | undefined;

/** ログイン中ユーザーのID（未ログイン/取得前は null/undefined） */
export function useCurrentUserId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(cachedId);

  useEffect(() => {
    // 実IDが確定済みなら再取得しない。null/undefined（未取得・一時的な未ログイン）なら取得を試みる
    if (cachedId != null) return;
    let alive = true;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const uid = d?.user?.id ?? null;
        if (uid != null) cachedId = uid; // 成功IDのみ永続キャッシュ（nullは保持せず次回再取得）
        if (alive) setId(uid);
      })
      .catch(() => { if (alive) setId(null); });
    return () => { alive = false; };
  }, []);

  return id;
}
