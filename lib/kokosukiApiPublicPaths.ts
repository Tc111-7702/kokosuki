/** proxy でセッション／token なしに通す公開 API（ログイン前・閲覧専用） */
export function isPublicKokosukiApiPath(pathname: string, method: string): boolean {
  const m = method.toUpperCase();

  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/api/profile/handle-available') return true;
  if (pathname === '/api/profile/reset-password') return true;
  if (pathname === '/api/gacha/signup-gachas') return true;
  if (pathname === '/api/gacha/signup-popular-ips') return true;
  if (pathname === '/api/gacha/signup-ip-search') return true;

  if (pathname === '/api/area-suggest') return true;
  if (pathname === '/api/station-suggest') return true;
  if (pathname === '/api/gacha/search') return true;
  if (pathname === '/api/gacha/filters') return true;
  if (pathname === '/api/gacha/genre') return true;
  if (pathname === '/api/gacha/by-ips') return true;
  if (pathname === '/api/gacha/ip-groups') return true;
  if (pathname === '/api/gacha/popular-ips') return true;
  if (pathname === '/api/gacha/wp-categories') return true;
  if (pathname.startsWith('/api/gacha/home-pickup/')) return true;
  if (pathname === '/api/spots/search') return true;
  if (pathname === '/api/spots/nearby') return true;
  if (pathname === '/api/community/trending') return true;

  if (m === 'GET' && /^\/api\/spots\/[^/]+$/.test(pathname)) return true;
  if (m === 'GET' && /^\/api\/gacha\/[^/]+$/.test(pathname)) return true;

  if (m !== 'GET') return false;

  if (pathname === '/api/me') return true;
  if (pathname === '/api/gacha/liked-ids') return true;
  if (pathname === '/api/gacha/recommended') return true;
  if (pathname === '/api/gacha/popular') return true;
  if (pathname === '/api/gacha/by-category') return true;
  if (pathname === '/api/users/search') return true;
  if (/^\/api\/users\/[^/]+\/(summary|favorites)$/.test(pathname)) return true;
  if (/^\/api\/users\/[^/]+\/(posts|stock-posts)$/.test(pathname)) return true;
  if (/^\/api\/posts\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/stock-posts\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/spots\/[^/]+\/reviews$/.test(pathname)) return true;
  if (/^\/api\/gacha\/[^/]+\/like$/.test(pathname)) return true;

  return false;
}
