import { prisma } from '@/lib/db';

// 通知の作成ヘルパー。
// すべて内部でエラーを握りつぶす（通知の失敗で投稿・いいね等の本処理を落とさない）。

const STOCK_LABEL: Record<string, string> = {
  in_stock: '在庫あり',
  low_stock: '残りわずか',
  out_of_stock: '売り切れ',
};

const TARGET_LABEL = {
  post: '引いた！投稿',
  stockPost: '在庫報告',
  spotReview: '口コミ',
} as const;

export type NotifyTargetKind = keyof typeof TARGET_LABEL;

/** 在庫投稿 → そのガチャをお気に入り登録している全ユーザー（投稿者本人を除く）へ */
export async function notifyFavoriteStock(stockPost: {
  id: string;
  userId: string;
  gachaId: string;
  spotId: string;
  stockStatus: string;
}) {
  try {
    // お気に入り＝GachaLike（オンボの❤️・ガチャ詳細のいいねと同一。UserFavoriteGachaは未使用の休眠テーブル）
    const [favorites, gacha, spot] = await Promise.all([
      prisma.gachaLike.findMany({
        where: { gachaId: stockPost.gachaId, NOT: { userId: stockPost.userId } },
        select: { userId: true },
      }),
      prisma.gacha.findUnique({ where: { id: stockPost.gachaId }, select: { seriesName: true } }),
      prisma.spot.findUnique({ where: { id: stockPost.spotId }, select: { name: true } }),
    ]);
    if (favorites.length === 0 || !gacha || !spot) return;

    const label = STOCK_LABEL[stockPost.stockStatus] ?? stockPost.stockStatus;
    await prisma.notification.createMany({
      data: favorites.map(({ userId }) => ({
        userId,
        type: 'favorite_stock',
        title: 'お気に入りの在庫情報',
        body: `${gacha.seriesName}（${spot.name}）: ${label}`,
        gachaId: stockPost.gachaId,
        spotId: stockPost.spotId,
        stockPostId: stockPost.id,
        actorId: stockPost.userId,
      })),
    });
  } catch (e) {
    console.error('[notifyFavoriteStock]', e);
  }
}

/** 対象投稿の投稿主と所属スポットを解決 */
async function resolveTarget(
  kind: NotifyTargetKind,
  targetId: string,
): Promise<{ ownerId: string; spotId: string | null } | null> {
  if (kind === 'post') {
    const p = await prisma.post.findUnique({ where: { id: targetId }, select: { userId: true, spotId: true } });
    return p ? { ownerId: p.userId, spotId: p.spotId } : null;
  }
  if (kind === 'stockPost') {
    const p = await prisma.stockPost.findUnique({ where: { id: targetId }, select: { userId: true, spotId: true } });
    return p ? { ownerId: p.userId, spotId: p.spotId } : null;
  }
  const r = await prisma.spotReview.findUnique({ where: { id: targetId }, select: { userId: true, spotId: true } });
  return r ? { ownerId: r.userId, spotId: r.spotId } : null;
}

function targetIdFields(kind: NotifyTargetKind, targetId: string) {
  return {
    postId: kind === 'post' ? targetId : undefined,
    stockPostId: kind === 'stockPost' ? targetId : undefined,
    spotReviewId: kind === 'spotReview' ? targetId : undefined,
  };
}

/** いいね → 投稿主へ（自分の投稿への自分のいいねは通知しない） */
export async function notifyLike(kind: NotifyTargetKind, targetId: string, actorId: string) {
  try {
    const target = await resolveTarget(kind, targetId);
    if (!target || target.ownerId === actorId) return;
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: target.ownerId,
        type: 'like',
        title: 'いいねがつきました',
        body: `${actor?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}にいいねしました`,
        actorId,
        spotId: target.spotId ?? undefined,
        ...targetIdFields(kind, targetId),
      },
    });
  } catch (e) {
    console.error('[notifyLike]', e);
  }
}

/** 返信 → 投稿主へ（自分の投稿への自分の返信は通知しない） */
export async function notifyReply(kind: NotifyTargetKind, targetId: string, actorId: string, text: string) {
  try {
    const target = await resolveTarget(kind, targetId);
    if (!target || target.ownerId === actorId) return;
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const excerpt = text.length > 30 ? `${text.slice(0, 30)}…` : text;
    await prisma.notification.create({
      data: {
        userId: target.ownerId,
        type: 'reply',
        title: '返信がきました',
        body: `${actor?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}に返信しました：${excerpt}`,
        actorId,
        spotId: target.spotId ?? undefined,
        ...targetIdFields(kind, targetId),
      },
    });
  } catch (e) {
    console.error('[notifyReply]', e);
  }
}
