import * as db from '@/lib/db';

// サーバー側のレート制限（IP単位など）。RequestRateLimit テーブルで固定ウィンドウ＋ロックを管理する。
// localStorage と違いクライアントから回避できないため、enumeration/総当たりの実効的な抑止になる。

export interface RateLimitResult {
  locked: boolean;
  lockedUntil: Date | null;
}

export interface RateLimitOptions {
  limit: number; // ウィンドウ内で許す失敗回数
  windowMs: number; // カウントのウィンドウ長
  lockMs: number; // 到達時のロック時間
}

/** リクエスト元のIPを取得する（Vercel 等のプロキシ経由を想定）。 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** 現在ロック中かを確認する（カウントは変更しない）。 */
export async function getRateLimitStatus(key: string): Promise<RateLimitResult> {
  const row = await db.findRequestRateLimit(key);
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: row.lockedUntil };
  }
  return { locked: false, lockedUntil: null };
}

/**
 * 失敗を1回記録する。ウィンドウ超過・ロック期限切れならリセットしてから加算し、
 * 規定回数に達したらロック時刻をセットする。戻り値は「この時点でロック中か」。
 */
export async function registerRateLimitFailure(
  key: string,
  { limit, windowMs, lockMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = new Date();
  const row = await db.findRequestRateLimit(key);

  if (row?.lockedUntil && row.lockedUntil > now) {
    return { locked: true, lockedUntil: row.lockedUntil };
  }

  let count = row?.count ?? 0;
  let windowStart = row?.windowStart ?? now;
  const windowExpired = now.getTime() - windowStart.getTime() > windowMs;
  const lockExpired = row?.lockedUntil != null && row.lockedUntil <= now;
  if (!row || windowExpired || lockExpired) {
    count = 0;
    windowStart = now;
  }

  count += 1;
  const lockedUntil = count >= limit ? new Date(now.getTime() + lockMs) : null;

  await db.upsertRequestRateLimit({ key, count, windowStart, lockedUntil });

  return { locked: lockedUntil != null, lockedUntil };
}
