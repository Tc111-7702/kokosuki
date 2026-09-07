import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
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
});

export type Session = typeof auth.$Infer.Session;
