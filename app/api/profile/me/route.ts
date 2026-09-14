import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { headers } from 'next/headers';
import { HANDLE_FORMAT_ERROR, isSignupHandleFormatValid } from '@/lib/signupHandle';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user;
  const [profile, likedGachaIds] = await Promise.all([
    db.findProfileByUserId(user.id),
    db.getLikedGachaIds(user.id),
  ]);

  return NextResponse.json({
    id:            user.id,
    name:          user.name,
    email:         user.email,
    handle:        profile?.handle ?? null,
    avatarUrl:     user.image ?? null,
    bio:           profile?.bio ?? null,
    likedGachaIds,
  });
}

const RADIUS_MIN = 1_000;
const RADIUS_MAX = 200_000;

// PATCH /api/profile/me — プロフィール・設定の更新（渡されたフィールドのみ反映）
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { name, handle, bio, avatarUrl, favoriteIps, mapRadiusM } = body as {
    name?: string;
    handle?: string;
    bio?: string;
    avatarUrl?: string | null;
    favoriteIps?: string[];
    mapRadiusM?: number;
  };

  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 30)) {
    return NextResponse.json({ error: '名前は1〜30文字で入力してください' }, { status: 400 });
  }
  let normalizedHandle: string | undefined;
  if (handle !== undefined) {
    normalizedHandle = handle.trim().toLowerCase();
    if (!isSignupHandleFormatValid(normalizedHandle)) {
      return NextResponse.json({ error: HANDLE_FORMAT_ERROR }, { status: 400 });
    }
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 200)) {
    return NextResponse.json({ error: '一言は200文字以内で入力してください' }, { status: 400 });
  }
  if (
    favoriteIps !== undefined &&
    (!Array.isArray(favoriteIps) || favoriteIps.length > 10 || favoriteIps.some((ip) => typeof ip !== 'string' || !ip.trim()))
  ) {
    return NextResponse.json({ error: '好きIPは10件までです' }, { status: 400 });
  }
  if (mapRadiusM !== undefined && (typeof mapRadiusM !== 'number' || mapRadiusM < RADIUS_MIN || mapRadiusM > RADIUS_MAX)) {
    return NextResponse.json({ error: '検索範囲が不正です' }, { status: 400 });
  }

  // handleの重複チェック（自分以外が使用中なら409）
  if (normalizedHandle !== undefined) {
    const existing = await db.findProfileByHandle(normalizedHandle);
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'このIDはすでに使われています' }, { status: 409 });
    }
  }

  // 名前はUserテーブル
  if (name !== undefined) {
    await db.updateUserName(userId, name.trim());
  }

  // それ以外はUserProfile
  const profileData: db.ProfileUpsertData = {};
  if (normalizedHandle !== undefined) profileData.handle = normalizedHandle;
  if (bio !== undefined) profileData.bio = bio;
  // アイコン：空文字/nullは削除扱い。アバターは User.image に一本化（全ポストカードに反映）
  if (avatarUrl !== undefined) {
    const normalized = avatarUrl ? avatarUrl : null;
    await db.updateUserImage(userId, normalized);
  }
  if (favoriteIps !== undefined) profileData.favoriteIps = favoriteIps.map((ip) => ip.trim());
  if (mapRadiusM !== undefined) profileData.mapRadiusM = mapRadiusM;

  if (Object.keys(profileData).length > 0) {
    await db.upsertUserProfile(userId, profileData);
  }

  return NextResponse.json({ ok: true });
}
