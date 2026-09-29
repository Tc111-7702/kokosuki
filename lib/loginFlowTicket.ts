import { createHmac, timingSafeEqual } from 'crypto';
import { LOGIN_FLOW_COOKIE_NAME, LOGIN_FLOW_TTL_SEC } from '@/lib/loginFlowCookie';

// ログインのステップをページ化するにあたり、「メール認証（コード送信）／メール確認が
// 済んでいない状態で認証コード・パスワード入力ページに直接来られる」のを防ぐための
// 短命チケット。DB は使わず、BETTER_AUTH_SECRET で署名した HttpOnly Cookie に載せる
// （ステートレスなのでマイグレーション不要）。実際の認証はサーバー側で行われるため、
// このチケットは「文脈のない裸のステップページに着地させない」ための遷移ガード。
// Cookie名/TTL は Edge(middleware) からも使うため lib/loginFlowCookie.ts に分離し、
// ここで再エクスポートして既存の import を維持する。
export { LOGIN_FLOW_COOKIE_NAME, LOGIN_FLOW_TTL_SEC };

export type LoginFlowStep = 'otp' | 'password';
export type LoginFlowProvider = 'email' | 'google' | 'apple';

export interface LoginFlowTicket {
  email: string;
  step: LoginFlowStep;
  provider: LoginFlowProvider;
  exp: number; // epoch ms
}

function secret(): string {
  return process.env.BETTER_AUTH_SECRET ?? 'kokosuki-dev-login-flow-secret';
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

export function normalizeLoginFlowProvider(value: unknown): LoginFlowProvider {
  return value === 'google' || value === 'apple' ? value : 'email';
}

/** チケット文字列（`<payload>.<sig>`）を生成する。 */
export function createLoginFlowTicket(input: {
  email: string;
  step: LoginFlowStep;
  provider: LoginFlowProvider;
}): string {
  const payload: LoginFlowTicket = {
    email: input.email.trim().toLowerCase(),
    step: input.step,
    provider: input.provider,
    exp: Date.now() + LOGIN_FLOW_TTL_SEC * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** チケットを検証。無効・期限切れ・ステップ不一致なら null。 */
export function verifyLoginFlowTicket(
  token: string | undefined | null,
  requiredStep?: LoginFlowStep,
): LoginFlowTicket | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: LoginFlowTicket;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    !payload ||
    typeof payload.email !== 'string' ||
    (payload.step !== 'otp' && payload.step !== 'password') ||
    typeof payload.exp !== 'number'
  ) {
    return null;
  }
  if (Date.now() > payload.exp) return null;
  if (requiredStep && payload.step !== requiredStep) return null;
  return payload;
}

export function loginFlowCookieOptions(maxAge = LOGIN_FLOW_TTL_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
