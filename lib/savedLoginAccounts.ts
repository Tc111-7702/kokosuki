export type SavedLoginAccount = {

  email: string;

  name: string;

  avatarUrl: string | null;

};



export type SavedLoginProvider = 'google' | 'apple' | 'email';



const STORAGE_KEYS = {

  google: 'mikke_saved_login_google',

  apple: 'mikke_saved_login_apple',

  email: 'mikke_saved_login_email',

} as const;



const MAX_ACCOUNTS_PER_KEY = 3;



function providerKeyForEmail(email: string): SavedLoginProvider {

  const lower = email.trim().toLowerCase();

  if (lower.endsWith('@gmail.com')) return 'google';

  if (lower.endsWith('@icloud.com')) return 'apple';

  return 'email';

}



function readList(key: SavedLoginProvider): SavedLoginAccount[] {

  if (typeof window === 'undefined') return [];

  try {

    const raw = localStorage.getItem(STORAGE_KEYS[key]);

    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed

      .filter((item): item is SavedLoginAccount => (

        typeof item === 'object'

        && item !== null

        && typeof (item as SavedLoginAccount).email === 'string'

        && typeof (item as SavedLoginAccount).name === 'string'

      ))

      .map((item) => ({

        email: item.email.trim().toLowerCase(),

        name: item.name.trim() || item.email.split('@')[0] || 'ユーザー',

        avatarUrl: typeof item.avatarUrl === 'string' ? item.avatarUrl : null,

      }));

  } catch {

    return [];

  }

}



function writeList(key: SavedLoginProvider, accounts: SavedLoginAccount[]): void {

  if (typeof window === 'undefined') return;

  try {

    if (accounts.length === 0) {

      localStorage.removeItem(STORAGE_KEYS[key]);

      return;

    }

    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(accounts.slice(0, MAX_ACCOUNTS_PER_KEY)));

  } catch {

    /* localStorage 不可時は無害にスキップ */

  }

}



export function getSavedAccountsForProvider(provider: 'google' | 'apple'): SavedLoginAccount[] {

  return readList(provider);

}



export function saveLoginAccount(account: SavedLoginAccount): void {

  const normalizedEmail = account.email.trim().toLowerCase();

  const key = providerKeyForEmail(normalizedEmail);

  const normalized: SavedLoginAccount = {

    email: normalizedEmail,

    name: account.name.trim() || account.email.split('@')[0] || 'ユーザー',

    avatarUrl: account.avatarUrl ?? null,

  };

  const next = [

    normalized,

    ...readList(key).filter((item) => item.email !== normalized.email),

  ].slice(0, MAX_ACCOUNTS_PER_KEY);

  writeList(key, next);

}



export function removeLoginAccount(email: string): void {

  const normalized = email.trim().toLowerCase();

  (Object.keys(STORAGE_KEYS) as SavedLoginProvider[]).forEach((key) => {

    const next = readList(key).filter((item) => item.email !== normalized);

    writeList(key, next);

  });

}



/** メールアドレス変更完了時: 旧アドレスを削除し、新アドレスをドメインに応じた key へ保存 */

export function syncLoginEmailChange(

  oldEmail: string,

  newEmail: string,

  profile: { name: string; avatarUrl: string | null },

): void {

  removeLoginAccount(oldEmail);

  saveLoginAccount({

    email: newEmail,

    name: profile.name,

    avatarUrl: profile.avatarUrl,

  });

}


