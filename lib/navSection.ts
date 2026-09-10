/** サイドバー/ボトムナビのアクティブ判定用（直前にいた主要セクション） */
export type NavSection = 'home' | 'map' | 'mypage';

const KEY = 'mikke_nav_section';

export function getNavSection(): NavSection {
  if (typeof window === 'undefined') return 'home';
  const v = sessionStorage.getItem(KEY);
  if (v === 'map' || v === 'mypage') return v;
  return 'home';
}

export function setNavSection(section: NavSection) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, section);
}

export function isGachaPage(pathname: string) {
  return pathname.startsWith('/gacha/');
}

export function isOwnMypage(pathname: string, myId: string | null | undefined) {
  if (pathname === '/mypage') return true;
  if (myId == null) return false;
  return pathname === `/mypage/${myId}`;
}

export function isOthersMypage(pathname: string, myId: string | null | undefined) {
  if (!pathname.startsWith('/mypage/')) return false;
  if (myId === undefined) return false;
  const id = pathname.slice('/mypage/'.length).split('/')[0];
  if (myId === null) return true;
  return id !== myId;
}

export function isContextualNavPage(pathname: string, myId: string | null | undefined) {
  return isGachaPage(pathname) || isOthersMypage(pathname, myId);
}

/** 現在の pathname から nav section を更新すべきなら返す（gacha/他人mypageは null） */
export function navSectionForPathname(
  pathname: string,
  myId: string | null | undefined,
): NavSection | null {
  if (pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/map') || pathname.startsWith('/store/')) return 'map';
  if (pathname === '/settings' || isOwnMypage(pathname, myId)) return 'mypage';
  if (isContextualNavPage(pathname, myId)) return null;
  return null;
}
