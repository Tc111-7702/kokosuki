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

  // 1行で入れた場合の "\n" を実改行へ復元してから鍵を読む。
  const privateKey = crypto.createPrivateKey(rawKey.replace(/\\n/g, '\n'));
  // dsaEncoding: 'ieee-p1363' で ECDSA 署名を JOSE 形式(R||S)で得る。
  const signature = crypto
    .sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');

  return `${signingInput}.${signature}`;
}
