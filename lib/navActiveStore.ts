'use client';

import { useEffect, useSyncExternalStore } from 'react';

/** サイドバー/ボトムナビでアクティブ表示する主要セクション。
 * 'post' は投稿ページ用。4タブ(home/map/notifications/mypage)のどれにも一致しないため、
 * 投稿ページでは「投稿する」以外のタブが一切アクティブにならない。 */
export type NavKey = 'home' | 'map' | 'notifications' | 'mypage' | 'post';

// 直近にマウントされた「確定ページ」のセクションを保持する軽量ストア。
// gacha 詳細・他人のマイページはこの値を書き換えないため、それらのページでは
// 「直前にいたセクション」がそのままアクティブ表示される。
let current: NavKey = 'home';
const listeners = new Set<() => void>();

export function getNavActive(): NavKey {
  return current;
}

export function setNavActive(key: NavKey): void {
  if (current === key) return;
  current = key;
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** 現在アクティブなセクションを購読する（BottomNav / PageNav 用） */
export function useNavActiveKey(): NavKey {
  return useSyncExternalStore(subscribe, getNavActive, () => 'home');
}

/**
 * ページのマウント時にアクティブなセクションを設定する。
 * key に null を渡すと書き換えない（gacha 詳細・他人のマイページなど、
 * 直前のセクションを保持したいページ用）。
 */
export function useSetNavActive(key: NavKey | null): void {
  useEffect(() => {
    if (key != null) setNavActive(key);
  }, [key]);
}
