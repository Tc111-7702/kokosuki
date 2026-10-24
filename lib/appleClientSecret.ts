import crypto from 'crypto';

// Apple「Sign in with Apple」の client_secret（ES256 署名JWT）を生成する。
// Apple は client_secret に共有文字列ではなく、.p8 秘密鍵で署名したJWTを要求する。
// 有効期限は最長6か月。サーバー起動（モジュール評価）ごとに生成するため実運用では常に新しい。
//
// 必要な環境変数:
//   APPLE_CLIENT_ID      … Services ID（sub）
//   APPLE_TEAM_ID        … Team ID（iss）
//   APPLE_KEY_ID         … Key ID（ヘッダ kid）
//   APPLE_PRIVATE_KEY    … .p8 の中身（\n は実改行に復元）
const APPLE_AUDIENCE = 'https://appleid.apple.com';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * APPLE_PRIVATE_KEY をどんな貼り方でも有効な PEM に正規化する。
 * 以下のいずれでも動くよう、一度 base64 本体だけを取り出して正規の PEM に組み直す:
 *   - 複数行（.p8 のマーカー込み・各行改行あり）
 *   - 1行に詰まった形（マーカーありだが改行なし）
 *   - "\n"/"\r" エスケープで改行を表した1行
 *   - base64 本体だけ（マーカーなし）
 * 前後の空白／値ごと残った引用符も除去する。
 */
function normalizeApplePrivateKey(rawKey: string): string {
  const s = rawKey
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .trim();

  // マーカーのラベル（通常 "PRIVATE KEY"）を保持。無ければ PKCS#8 とみなす。
  const beginMatch = s.match(/-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----/);
  const label = beginMatch ? beginMatch[1] : 'PRIVATE KEY';

  // マーカーを外し、空白を全除去して base64 本体だけにする。
  const body = s
    .replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g, '')
    .replace(/-----END [A-Z0-9 ]*PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  // 64文字ごとに折り返して正規の PEM を組み立てる。
  const wrapped = body.replace(/(.{64})/g, '$1\n').trim();
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
}

/** 設定が揃っていれば client_secret(JWT) を返す。未設定なら空文字。 */
export function getAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const rawKey = process.env.APPLE_PRIVATE_KEY;
  if (!teamId || !keyId || !clientId || !rawKey) return '';

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 60 * 24 * 180, // 約180日（Appleの上限6か月以内）
    aud: APPLE_AUDIENCE,
    sub: clientId,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  // 鍵のパース/署名が失敗しても例外を投げず空文字を返す。
  // この関数は auth.ts のモジュール評価時に呼ばれるため、ここで throw すると
  // Apple だけでなく全 auth API が 500 になってしまう。失敗時は Apple だけ無効化する。
  try {
    const privateKey = crypto.createPrivateKey(normalizeApplePrivateKey(rawKey));
    // dsaEncoding: 'ieee-p1363' で ECDSA 署名を JOSE 形式(R||S)で得る。
    const signature = crypto
      .sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' })
      .toString('base64url');
    return `${signingInput}.${signature}`;
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(
      `[appleClientSecret] APPLE_PRIVATE_KEY の読み込みに失敗したため Apple 認証を無効化します: ${reason}`,
    );
    return '';
  }
}
