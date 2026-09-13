/** Better Auth のパスワード再設定リンクを /api/auth 付きの正しい URL に直す。 */
export function normalizePasswordResetUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/api/auth/')) return parsed.href;
    if (parsed.pathname.startsWith('/reset-password/')) {
      parsed.pathname = `/api/auth${parsed.pathname}`;
      return parsed.href;
    }
    return parsed.href;
  } catch {
    return url;
  }
}
