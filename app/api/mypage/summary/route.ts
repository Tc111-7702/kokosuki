import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/mypage/summary — マイページ用のプロフィール＋統計＋設定
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const [profile, postCount, kamibikiCount, postLikes, stockPostLikes] = await Promise.all([
      db.findProfileByUserId(userId),
      db.countUserPosts(userId),
      db.countUserPostsByResult(userId, '神引き'),
      db.countLikesOnUserPosts(userId),
      db.countLikesOnUserStockPosts(userId),
    ]);

    return NextResponse.json({
      name:      session.user.name,
      email:     session.user.email,
      handle:    profile?.handle ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      bio:       profile?.bio ?? null,
      favoriteIps: profile?.favoriteIps ?? [],
      stats: {
        postCount,
        kamibikiCount,
        likeCount: postLikes + stockPostLikes, // 引いた！＋在庫報告の合算いいね
      },
      settings: {
        notifyFavoriteStock: profile?.notifyFavoriteStock ?? true,
        notifyReaction:      profile?.notifyReaction ?? true,
        mapRadiusM:          profile?.mapRadiusM ?? 20000,
      },
    });
  } catch (e) {
    console.error('[mypage summary]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
