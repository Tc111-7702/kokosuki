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

// ファンアウトの1バッチあたりの宛先数上限（パラメータ数・リクエストサイズの抑制）
const FANOUT_BATCH_SIZE = 500;

/** 在庫投稿 → そのガチャをお気に入り登録している全ユーザー（投稿者本人を除く）へ */
export async function notifyFavoriteStock(stockPost: {
  id: string;
  userId: string;
  gachaId: string;
  spotId: string;
  stockStatus: string;
  isPublic?: boolean;
}) {
  try {
    // 非公開投稿は通知しない
    if (stockPost.isPublic === false) return;

    // お気に入り＝GachaLike（オンボの❤️・ガチャ詳細のいいねと同一。UserFavoriteGachaは未使用の休眠テーブル）
    const [gacha, spot] = await Promise.all([
      prisma.gacha.findUnique({ where: { id: stockPost.gachaId }, select: { seriesName: true } }),
      prisma.spot.findUnique({ where: { id: stockPost.spotId }, select: { name: true } }),
    ]);
    if (!gacha || !spot) return;

    const label = STOCK_LABEL[stockPost.stockStatus] ?? stockPost.stockStatus;
    const body = `${gacha.seriesName}（${spot.name}）: ${label}`;

    // 宛先が多くてもメモリ・1クエリのサイズが膨らまないよう、カーソルでバッチ処理
    let cursor: string | undefined;
    for (;;) {
      const favorites = await prisma.gachaLike.findMany({
        where: { gachaId: stockPost.gachaId, NOT: { userId: stockPost.userId } },
        select: { id: true, userId: true },
        orderBy: { id: 'asc' },
        take: FANOUT_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (favorites.length === 0) break;

      // 通知設定でOFFにしているユーザーを除外（プロフィール未作成はデフォルトON扱い）
      const disabled = await prisma.userProfile.findMany({
        where: { userId: { in: favorites.map((f) => f.userId) }, notifyFavoriteStock: false },
        select: { userId: true },
      });
      const disabledSet = new Set(disabled.map((d) => d.userId));
      const recipients = favorites.filter((f) => !disabledSet.has(f.userId));

      await prisma.notification.createMany({
        data: recipients.map(({ userId }) => ({
          userId,
          type: 'favorite_stock',
          title: 'お気に入りの在庫情報',
          body,
          gachaId: stockPost.gachaId,
          spotId: stockPost.spotId,
          stockPostId: stockPost.id,
          actorId: stockPost.userId,
        })),
      });

      if (favorites.length < FANOUT_BATCH_SIZE) break;
      cursor = favorites[favorites.length - 1].id;
    }
  } catch (e) {
    console.error('[notifyFavoriteStock]', e);
  }
}

/** 対象投稿の投稿主と所属スポットを解決（非公開投稿はnull=通知対象外） */
async function resolveTarget(
  kind: NotifyTargetKind,
  targetId: string,
): Promise<{ ownerId: string; spotId: string | null } | null> {
  if (kind === 'post') {
    const p = await prisma.post.findFirst({
      where: { id: targetId, isPublic: true },
      select: { userId: true, spotId: true },
    });
    return p ? { ownerId: p.userId, spotId: p.spotId } : null;
  }
  if (kind === 'stockPost') {
    const p = await prisma.stockPost.findFirst({
      where: { id: targetId, isPublic: true },
      select: { userId: true, spotId: true },
    });
    return p ? { ownerId: p.userId, spotId: p.spotId } : null;
  }
  const r = await prisma.spotReview.findFirst({
    where: { id: targetId, isPublic: true },
    select: { userId: true, spotId: true },
  });
  return r ? { ownerId: r.userId, spotId: r.spotId } : null;
}

/** 反応通知（いいね・返信）をOFFにしているか（プロフィール未作成はデフォルトON扱い） */
async function isReactionNotifyDisabled(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { notifyReaction: true },
  });
  return profile?.notifyReaction === false;
}

/** 通知行の対象ID条件（対象種別に応じた1列だけを指す） */
function targetIdWhere(kind: NotifyTargetKind, targetId: string) {
  if (kind === 'post') return { postId: targetId };
  if (kind === 'stockPost') return { stockPostId: targetId };
  return { spotReviewId: targetId };
}

/** いいね → 投稿主へ（自分の投稿への自分のいいねは通知しない） */
export async function notifyLike(kind: NotifyTargetKind, targetId: string, actorId: string) {
  try {
    const target = await resolveTarget(kind, targetId);
    if (!target || target.ownerId === actorId) return;
    if (await isReactionNotifyDisabled(target.ownerId)) return;

    // unlike→like の繰り返しによる重複通知を抑止（同一actor×同一対象のいいね通知は1件まで）
    const existing = await prisma.notification.findFirst({
      where: { userId: target.ownerId, type: 'like', actorId, ...targetIdWhere(kind, targetId) },
      select: { id: true },
    });
    if (existing) return;

    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: target.ownerId,
        type: 'like',
        title: 'いいねがつきました',
        body: `${actor?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}にいいねしました`,
        actorId,
        spotId: target.spotId ?? undefined,
        ...targetIdWhere(kind, targetId),
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
    if (await isReactionNotifyDisabled(target.ownerId)) return;
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
        ...targetIdWhere(kind, targetId),
      },
    });
  } catch (e) {
    console.error('[notifyReply]', e);
  }
}
