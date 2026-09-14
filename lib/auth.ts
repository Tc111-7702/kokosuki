import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import {
  captureExternalPasswordReset,
  finalizeMailDelivery,
  isExternalMailDelivery,
} from './mailDeliveryContext';
import { sendOtpEmail, sendPasswordResetEmail } from './mail';
import { prisma } from './db';

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
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
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
  ],
});

export type Session = typeof auth.$Infer.Session;
