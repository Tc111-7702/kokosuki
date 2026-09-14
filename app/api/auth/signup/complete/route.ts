import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import {
  clearSignupPendingByToken,
  getSignupPendingRecordForComplete,
} from '@/lib/signupPending';
import { decryptSignupPendingPassword } from '@/lib/signupPendingPassword';
import { HANDLE_FORMAT_ERROR, isSignupHandleFormatValid } from '@/lib/signupHandle';
import {
  SIGNUP_PENDING_COOKIE_NAME,
  getSignupPendingTokenFromCookieHeader,
  signupPendingCookieOptions,
} from '@/lib/signupPendingCookie';

/** POST /api/auth/signup/complete — SignupPending から本登録 */
export async function POST(req: Request) {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const token = getSignupPendingTokenFromCookieHeader(cookieHeader);
  if (!token) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }

  const record = await getSignupPendingRecordForComplete(token);
  if (!record) {
    return NextResponse.json({ error: '有効な新規登録セッションがありません' }, { status: 401 });
  }

  const { email, passwordEnc, name, birthDate, handle } = record;
  if (!passwordEnc || !name?.trim() || !birthDate || !handle?.trim()) {
    return NextResponse.json({ error: '登録情報が不足しています' }, { status: 400 });
  }

  const normalizedHandle = handle.trim().toLowerCase();
  if (!isSignupHandleFormatValid(normalizedHandle)) {
    return NextResponse.json({ error: HANDLE_FORMAT_ERROR }, { status: 400 });
  }

  const existingUser = await db.findUserIdByEmail(email);
  if (existingUser) {
    return NextResponse.json({ error: '既に登録されているメールアドレスです' }, { status: 409 });
  }

  const existingHandle = await db.findProfileByHandle(normalizedHandle);
  if (existingHandle) {
    return NextResponse.json({ error: 'このユーザーIDはすでに使われています' }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const favoriteGachaIds = Array.isArray(body?.favoriteGachaIds)
    ? body.favoriteGachaIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];

  let password: string;
  try {
    password = await decryptSignupPendingPassword(passwordEnc);
  } catch {
    return NextResponse.json({ error: '登録情報の復号に失敗しました' }, { status: 500 });
  }

  try {
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name.trim(),
      },
      headers: await headers(),
      asResponse: true,
    });

    if (!signUpResponse.ok) {
      const data = await signUpResponse.json().catch(() => null);
      const message = typeof data?.message === 'string' ? data.message : 'アカウントの作成に失敗しました';
      return NextResponse.json({ error: message }, { status: signUpResponse.status });
    }

    const signUpData = await signUpResponse.json().catch(() => null);
    const userId = typeof signUpData?.user?.id === 'string' ? signUpData.user.id : null;
    if (!userId) {
      return NextResponse.json({ error: 'アカウントの作成に失敗しました' }, { status: 500 });
    }

    await db.updateUserBirthDate(userId, birthDate);
    await db.markUserEmailVerified(userId);
    await db.upsertProfile(userId, normalizedHandle);

    if (favoriteGachaIds.length > 0) {
      await db.createGachaLikes(userId, favoriteGachaIds);
    }

    await clearSignupPendingByToken(token);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SIGNUP_PENDING_COOKIE_NAME, '', { ...signupPendingCookieOptions(0), maxAge: 0 });

    const setCookie = signUpResponse.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch (e) {
    console.error('[signup complete]', e);
    return NextResponse.json({ error: 'アカウントの作成に失敗しました' }, { status: 500 });
  }
}
