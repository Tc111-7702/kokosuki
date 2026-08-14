import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30日
    updateAge: 60 * 60 * 24,       // 1日ごとに更新
  },
  user: {
    additionalFields: {
      // 認可用のロール（'user' | 'admin'）。admin は seed で付与。session.user.role で参照
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false, // クライアントからの登録時に role を指定させない（改ざん防止）
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
