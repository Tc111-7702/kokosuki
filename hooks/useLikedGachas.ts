'use client';

import { useSyncExternalStore } from 'react';

// いいね済みガチャIDを全カードで共有する簡易ストア。
// 初回に /api/gacha/liked-ids を1回だけ取得し、トグルは楽観的更新＋POSTで確定する。
let likedSet = new Set<string>();
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function ensureLoaded() {
  if (loaded || loading) return;
  loading = fetch('/api/gacha/liked-ids')
    .then((r) => (r.ok ? r.json() : { ids: [] }))
    .then((d: { ids?: string[] }) => {
      likedSet = new Set(d.ids ?? []);
      loaded = true;
      emit();
    })
    .catch(() => {
      loaded = true;
    })
    .finally(() => {
      loading = null;
    });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureLoaded();
  return () => {
    listeners.delete(cb);
  };
}

function apply(id: string, liked: boolean) {
  const next = new Set(likedSet);
  if (liked) next.add(id);
  else next.delete(id);
  likedSet = next;
  emit();
}

async function toggle(id: string) {
  const wasLiked = likedSet.has(id);
  apply(id, !wasLiked); // 楽観的更新
  try {
    const res = await fetch(`/api/gacha/${id}/like`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const d = await res.json();
    apply(id, !!d.liked); // サーバーの結果で確定
  } catch {
    apply(id, wasLiked); // 失敗時は元に戻す
  }
}

export function useLikedGachas() {
  const set = useSyncExternalStore(subscribe, () => likedSet, () => likedSet);
  return {
    isLiked: (id: string) => set.has(id),
    toggle,
  };
}
