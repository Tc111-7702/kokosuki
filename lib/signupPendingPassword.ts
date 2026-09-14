import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';

function signupPendingSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not configured');
  }
  return secret;
}

export async function encryptSignupPendingPassword(password: string): Promise<string> {
  return symmetricEncrypt({
    key: signupPendingSecret(),
    data: password,
  });
}

export async function decryptSignupPendingPassword(passwordEnc: string): Promise<string> {
  return symmetricDecrypt({
    key: signupPendingSecret(),
    data: passwordEnc,
  });
}
