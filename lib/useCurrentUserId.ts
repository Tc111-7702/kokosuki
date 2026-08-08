'use client';

import { useEffect, useState } from 'react';

// モジュールキャッシュ（セッション中に /api/me を1回だけ叩く）
let cachedId: string | null | undefined;

/** ログイン中ユーザーのID（未ログイン/取得前は null/undefined） */
export function useCurrentUserId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(cachedId);

  useEffect(() => {
    if (cachedId !== undefined) {
      setId(cachedId);
      return;
    }
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        cachedId = d?.user?.id ?? null;
        setId(cachedId);
      })
      .catch(() => {
        cachedId = null;
        setId(null);
      });
  }, []);

  return id;
}
