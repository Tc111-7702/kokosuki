import { NextResponse } from 'next/server';
import { checkAndResetRateLimit, getClientIp } from '@/lib/rateLimit';
import { loginEmailRateKey } from '@/lib/loginEmailRateLimit';
import { loginPasswordRateKey } from '@/lib/loginPasswordRateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/login/lockout-status — 画面マウント時のロック状態確認。
 * - type=email    … メール誤入力(IP単位 login-email-fail:<ip>)を確認
 * - type=password … パスワード誤入力(アカウント単位 login-password-fail:<email>)を確認
 * ロック期限切れの行はここで削除（リセット）する。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const type = body?.type;

  let key: string | null = null;
  if (type === 'email') {
    key = loginEmailRateKey(getClientIp(req.headers));
  } else if (type === 'password') {
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ locked: false });
    }
    key = loginPasswordRateKey(email);
  } else {
    return NextResponse.json({ locked: false });
  }

  const { locked } = await checkAndResetRateLimit(key);
  return NextResponse.json({ locked });
}
