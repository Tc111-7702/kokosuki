/** パスワード要件の説明文（UI 表示用） */
export const PASSWORD_POLICY_HINT =
  '8文字以上で、大文字・小文字・数字・記号のうち3種類以上を含めてください';

function countCharTypes(password: string): number {
  let n = 0;
  if (/[A-Z]/.test(password)) n++;
  if (/[a-z]/.test(password)) n++;
  if (/[0-9]/.test(password)) n++;
  if (/[^A-Za-z0-9]/.test(password)) n++;
  return n;
}

/** 問題があれば日本語メッセージ、OK なら null */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return 'パスワードは8文字以上にしてください';
  if (password.length > 128) return 'パスワードが長すぎます';
  if (countCharTypes(password) < 3) return PASSWORD_POLICY_HINT;
  return null;
}

export function isPasswordPolicyValid(password: string): boolean {
  return validatePasswordPolicy(password) === null;
}
