'use client';

import { useSetNavActive, type NavKey } from '@/lib/navActiveStore';

/** サーバーコンポーネントのページからアクティブなナビセクションを設定するための薄いクライアント部品 */
export function NavActiveSetter({ section }: { section: NavKey }) {
  useSetNavActive(section);
  return null;
}
