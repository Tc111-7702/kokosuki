// 新規登録の「お気に入りIP／ガチャ」をメール前ステップから complete まで保持するための
// sessionStorage ラッパー（クライアント専用・非PII）。SignupPending token と同じ 30分の
// スライド有効期限を持たせ、各ページ mount で touch（期限更新）する。

const KEY = 'kokosuki_signup_favorites';
const TTL_MS = 30 * 60 * 1000; // SignupPending と揃える（30分）

export interface SignupFavorites {
  ipNames: string[];
  gachaIds: string[];
}

type Stored = SignupFavorites & { expiresAt: number };

function read(): Stored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (
      !parsed ||
      !Array.isArray(parsed.ipNames) ||
      !Array.isArray(parsed.gachaIds) ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.expiresAt) return null;
    return { ipNames: parsed.ipNames, gachaIds: parsed.gachaIds, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function write(fav: SignupFavorites): void {
  if (typeof window === 'undefined') return;
  try {
    const data: Stored = { ...fav, expiresAt: Date.now() + TTL_MS };
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* sessionStorage 不可時は保持できないが致命ではない */
  }
}

/**
 * 有効なお気に入りレコードが（期限内で）存在するか。
 * レコードは IP 選択ページの「次へ/スキップ」時にだけ作られるため、存在＝フロー通過。
 * 0件スキップを許すため、ipNames の件数は問わない（空配列でも有効）。
 */
export function hasValidSignupFavorites(): boolean {
  const cur = read();
  return !!cur;
}

/** 現在のお気に入りを取得（無効なら null）。 */
export function getSignupFavorites(): SignupFavorites | null {
  const cur = read();
  return cur ? { ipNames: cur.ipNames, gachaIds: cur.gachaIds } : null;
}

/** IP 選択を保存（ガチャは呼び出し側で別途クリア/選択）。 */
export function setSignupIpNames(ipNames: string[]): void {
  const cur = read();
  write({ ipNames, gachaIds: cur?.gachaIds ?? [] });
}

/** ガチャ選択を保存。 */
export function setSignupGachaIds(gachaIds: string[]): void {
  const cur = read();
  write({ ipNames: cur?.ipNames ?? [], gachaIds });
}

/** ガチャ選択だけ消す（IP選択ページ再訪時に最新IPへ整合させるため）。 */
export function clearSignupGachaIds(): void {
  const cur = read();
  if (cur) write({ ipNames: cur.ipNames, gachaIds: [] });
}

/** 有効期限を延長（各ページ mount で呼ぶ・有効なときのみ）。 */
export function touchSignupFavorites(): void {
  const cur = read();
  if (cur) write({ ipNames: cur.ipNames, gachaIds: cur.gachaIds });
}

/** すべて削除（登録完了時・/login 到達時）。 */
export function clearSignupFavorites(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
