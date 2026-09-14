import { createAuthEndpoint } from '@better-auth/core/api';
import { APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { parseUserOutput } from 'better-auth/db';
import * as z from 'zod';
import {
  getQuickLoginTokenFromCookieHeader,
  normalizeLoginEmail,
} from '@/lib/quickLoginCookie';
import { verifyQuickLoginToken } from '@/lib/quickLoginToken';

const quickSignInBodySchema = z.object({
  email: z.string().email(),
});

export function quickLoginAuthPlugin() {
  return {
    id: 'mikke-quick-login',
    endpoints: {
      quickSignIn: createAuthEndpoint(
        '/quick-login/sign-in',
        {
          method: 'POST',
          body: quickSignInBodySchema,
        },
        async (ctx) => {
          const email = normalizeLoginEmail(ctx.body.email);
          const cookieHeader = ctx.request?.headers.get('cookie') ?? '';
          const token = getQuickLoginTokenFromCookieHeader(cookieHeader, email);
          if (!token) {
            throw new APIError('UNAUTHORIZED', { message: '保存済みアカウントでのログインに失敗しました' });
          }

          const verified = await verifyQuickLoginToken(email, token);
          if (!verified) {
            throw new APIError('UNAUTHORIZED', { message: '保存済みアカウントでのログインに失敗しました' });
          }

          const user = await ctx.context.internalAdapter.findUserById(verified.userId);
          if (!user) {
            throw new APIError('UNAUTHORIZED', { message: '保存済みアカウントでのログインに失敗しました' });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, {
            session,
            user,
          });

          return ctx.json({
            token: session.token,
            user: parseUserOutput(ctx.context.options, user),
          });
        },
      ),
    },
  };
}
