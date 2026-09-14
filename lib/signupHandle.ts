/** ユーザーID（handle）形式: 4〜20字・半角英数字（小文字） */
export const SIGNUP_HANDLE_RE = /^[a-z0-9]{4,20}$/;

export const HANDLE_FORMAT_ERROR = '4-20字の半角英数字で入力してください';

export function normalizeSignupHandleInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function isSignupHandleFormatValid(handle: string): boolean {
  return SIGNUP_HANDLE_RE.test(handle);
}
