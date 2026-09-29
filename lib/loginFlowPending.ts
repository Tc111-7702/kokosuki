import { createHash, randomBytes } from 'crypto';
import * as db from '@/lib/db';
import { LOGIN_FLOW_TTL_SEC } from '@/lib/loginFlowCookie';

// ログインのステップをページ化するにあたり、「メール認証コード送信／メール確認が済んで
// いない状態で /login/otp・/login/password に直接来られる」のを防ぐための一時状態。
// 個人情報（メール）を Cookie/sessionStorage に置かないため、Cookie には不透明トークンだけを
// 置き、メールは DB(LoginFlowPending) に保持する。トークンで DB を引いてメールを解決する。

export type LoginFlowStep = 'otp' | 'password';
export type LoginFlowProvider = 'email' | 'google' | 'apple';

// 認証コードページの案内文（notice）は保存せず、この構造化データから再生成する。
export type LoginFlowMailMode = 'resend' | 'dev-redirect' | 'dev-console';

export interface LoginFlowPending {
  email: string;
  step: LoginFlowStep;
  provider: LoginFlowProvider;
  mailMode: LoginFlowMailMode | null;
  mailRedirectTo: string | null;
}

export function normalizeLoginFlowProvider(value: unknown): LoginFlowProvider {
  return value === 'google' || value === 'apple' ? value : 'email';
}

/** Cookie に載せる不透明トークン（PIIを含まない）。 */
export function generateLoginFlowToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashLoginFlowToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * ログインフローの一時状態を作成し、Cookie に載せるトークンを返す。
 * 同一メールの古い行と期限切れ行は掃除してから作成する。
 */
export async function createLoginFlowPending(input: {
  email: string;
  step: LoginFlowStep;
  provider: LoginFlowProvider;
  mailMode?: LoginFlowMailMode | null;
  mailRedirectTo?: string | null;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const token = generateLoginFlowToken();
  const expiresAt = new Date(Date.now() + LOGIN_FLOW_TTL_SEC * 1000);

  await db.deleteExpiredLoginFlowPendingRows().catch(() => undefined);
  await db.deleteLoginFlowPendingByEmail(email).catch(() => undefined);
  await db.createLoginFlowPendingRow({
    tokenHash: hashLoginFlowToken(token),
    email,
    step: input.step,
    provider: input.provider,
    mailMode: input.mailMode ?? null,
    mailRedirectTo: input.mailRedirectTo ?? null,
    expiresAt,
  });

  return token;
}

/**
 * トークンから一時状態を解決する。無効・期限切れ・ステップ不一致なら null。
 */
export async function resolveLoginFlowPending(
  token: string | undefined | null,
  requiredStep?: LoginFlowStep,
): Promise<LoginFlowPending | null> {
  if (!token) return null;
  const row = await db.findLoginFlowPendingByTokenHash(hashLoginFlowToken(token));
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await db.deleteLoginFlowPendingByTokenHash(hashLoginFlowToken(token)).catch(() => undefined);
    return null;
  }
  if (row.step !== 'otp' && row.step !== 'password') return null;
  if (requiredStep && row.step !== requiredStep) return null;
  return {
    email: row.email,
    step: row.step,
    provider: normalizeLoginFlowProvider(row.provider),
    mailMode: (row.mailMode as LoginFlowMailMode | null) ?? null,
    mailRedirectTo: row.mailRedirectTo ?? null,
  };
}
