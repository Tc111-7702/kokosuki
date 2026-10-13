// 新規登録の生年月日に関する共通バリデーション（クライアント/サーバー共用）。

export const MIN_SIGNUP_AGE = 13;

export const UNDER_MIN_AGE_ERROR = `ご登録には${MIN_SIGNUP_AGE}歳以上である必要があります。`;

/** 誕生日(ISO: YYYY-MM-DD)から満年齢を返す。不正な値は null。 */
export function calcAge(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

/** MIN_SIGNUP_AGE 未満ならエラーメッセージ、問題なければ null。空値は null（未入力扱い）。 */
export function validateBirthDateAge(iso: string): string | null {
  if (!iso) return null;
  const age = calcAge(iso);
  if (age === null) return null;
  if (age < MIN_SIGNUP_AGE) return UNDER_MIN_AGE_ERROR;
  return null;
}
