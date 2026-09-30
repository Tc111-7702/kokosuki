import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession, emailOTP } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import {
  captureExternalPasswordReset,
  finalizeMailDelivery,
  isExternalMailDelivery,
} from './mailDeliveryContext';
import { sendOtpEmail, sendPasswordResetEmail } from './mail';
import { prisma } from './db';
import * as db from './db';

/** Better Auth の Origin 検証用。www/apex 両方と env を許可（Cookie 付き POST 向け） */
function getKokosukiTrustedOrigins(): string[] {
  const origins = new Set<string>([
    'https://www.kokosuki.app',
    'https://kokosuki.app',
    'http://localhost:3000',
  ]);

  const baseURL = process.env.BETTER_AUTH_URL;
  if (baseURL) {
    try {
      origins.add(new URL(baseURL).origin);
    } catch {
      /* ignore invalid URL */
    }
  }

  const fromEnv = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',') ?? [];
  for (const item of fromEnv) {
    const trimmed = item.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      if (isExternalMailDelivery()) {
        captureExternalPasswordReset({ email: user.email, url, name: user.name });
        return;
      }
      const result = await sendPasswordResetEmail({ email: user.email, url, name: user.name });
      finalizeMailDelivery(result);
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  trustedOrigins: getKokosukiTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30日
    updateAge: 60 * 60 * 24,       // 1日ごとに更新
  },
  user: {
    additionalFields: {
      // UserProfileはリレーションで管理するため不要
    },
  },
  databaseHooks: {
    session: {
      create: {
        // 無効化(BAN・凍結)されたアカウントはセッションを作らせない＝ログイン不可にする。
        // セッション作成は email/password・ソーシャル等すべてのログインで通るため、ここで一括ブロックする。
        before: async (session) => {
          const user = await db.getUserIsActiveById(session.userId);
          if (user && !user.isActive) {
            throw new APIError('FORBIDDEN', {
              message: 'このアカウントは無効化されています。',
            });
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      changeEmail: { enabled: true },
      async sendVerificationOTP({ email, otp, type }) {
        const result = await sendOtpEmail({ email, otp, type });
        finalizeMailDelivery(result);
      },
    }),
    // get-session のレスポンスから機微情報を除外する。
    // Better Auth 既定では session トークン・ipAddress・userAgent まで JSON で返るため、
    // Cookie を HttpOnly にしていても、これらがクライアント JS から読めてしまう。
    // アプリ側は session の有無しか参照しないので、必要な項目だけを返す。
    // 注意: customSession は必ずプラグイン配列の末尾に置く（Better Auth の仕様）。
    customSession(async ({ user, session }) => ({
      user,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    })),
  ],
});

export type Session = typeof auth.$Infer.Session;
