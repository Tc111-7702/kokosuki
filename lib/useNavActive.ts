'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCurrentUserId } from '@/lib/useCurrentUserId';
import {
  type NavSection,
  getNavSection,
  setNavSection,
  isGachaPage,
  isOwnMypage,
  isOthersMypage,
  isContextualNavPage,
  navSectionForPathname,
} from '@/lib/navSection';

/** サイドバー/ボトムナビのアクティブ状態（PageNav / BottomNav 共通） */
export function useNavActive() {
  const pathname = usePathname();
  const myId = useCurrentUserId();
  const [section, setSection] = useState<NavSection>(() =>
    typeof window !== 'undefined' ? getNavSection() : 'home',
  );

  useEffect(() => {
    const next = navSectionForPathname(pathname, myId);
    if (next != null) {
      setNavSection(next);
      setSection(next);
    } else if (isContextualNavPage(pathname, myId)) {
      setSection(getNavSection());
    }
  }, [pathname, myId]);

  const isNavActive = useCallback(
    (path: string) => {
      switch (path) {
        case '/home':
          if (pathname.startsWith('/home')) return true;
          if (isGachaPage(pathname) || isOthersMypage(pathname, myId)) return section === 'home';
          return false;
        case '/map':
          if (pathname.startsWith('/map') || pathname.startsWith('/store/')) return true;
          if (isGachaPage(pathname) || isOthersMypage(pathname, myId)) return section === 'map';
          return false;
        case '/mypage':
          if (pathname === '/settings') return true;
          if (isOwnMypage(pathname, myId)) return true;
          if (isGachaPage(pathname) || isOthersMypage(pathname, myId)) return section === 'mypage';
          return false;
        case '/notifications':
          return pathname.startsWith('/notifications');
        default:
          return pathname.startsWith(path);
      }
    },
    [pathname, myId, section],
  );

  return isNavActive;
}
