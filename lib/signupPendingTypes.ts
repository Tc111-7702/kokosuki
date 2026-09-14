/** 戻る操作で SignupPending から削除を開始するステップ */
export type SignupPendingCancelStep =
  | 'otp'
  | 'password'
  | 'name'
  | 'birthDate'
  | 'handle';

/** SignupPending の公開フィールド（パスワードは含めない） */
export type SignupPendingPublic = {
  email: string;
  expiresAt: string;
  hasPassword: boolean;
  name: string | null;
  birthDate: string | null;
  handle: string | null;
};

/** SignupPending 更新用（PATCH） */
export type SignupPendingPatch = {
  password?: string;
  name?: string | null;
  birthDate?: string | null;
  handle?: string | null;
};
