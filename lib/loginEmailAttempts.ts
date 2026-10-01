// ログインのメールアドレス入力で「登録されていないメールアドレスです」エラーが続いた回数を
// localStorage で数え、5回で15分ロックする（クライアント専用）。
//
// 注意: localStorage は手動クリア/シークレット/別ブラウザ/API直叩きで回避できるため、
// これ単体はセキュリティ境界にはならない（UI上の抑止）。本格的な総当たり対策は
// サーバー側のレート制限で別途行うこと。

const KEY = 'kokosuki_login_email_attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15分

interface AttemptState {
  count: number;
  lockedUntil: number | null;
}

function read(): AttemptState {
  if (typeof window === 'undefined') return { count: 0, lockedUntil: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null,
    };
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function write(state: AttemptState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* localStorage 不可時は数えられないが致命ではない */
  }
}

/** ロック中か（期限切れなら自動的にリセットして false）。 */
export function isLoginEmailLocked(): boolean {
  const s = read();
  if (s.lockedUntil && Date.now() < s.lockedUntil) return true;
  if (s.lockedUntil && Date.now() >= s.lockedUntil) {
    // 期限切れ → リセットして再び試行可能にする。
    write({ count: 0, lockedUntil: null });
  }
  return false;
}

/**
 * 「登録されていないメールアドレス」エラーを1回記録する。
 * 規定回数に達したらロック時刻をセットする。戻り値は「この時点でロック中か」。
 */
export function recordUnregisteredLoginEmail(): boolean {
  const s = read();
  // すでにロック中ならカウントを増やさずロック継続。
  if (s.lockedUntil && Date.now() < s.lockedUntil) return true;

  const count = s.count + 1;
  if (count >= MAX_ATTEMPTS) {
    write({ count, lockedUntil: Date.now() + LOCK_MS });
    return true;
  }
  write({ count, lockedUntil: null });
  return false;
}

/** ログイン成功（または正規のメール送信成功）時にカウントを消す。 */
export function clearLoginEmailAttempts(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
