import * as db from '@/lib/db';

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
}) {
  try {
    const [gacha, spot] = await Promise.all([
      db.getGachaById(stockPost.gachaId),
      db.getSpotById(stockPost.spotId),
    ]);
    if (!gacha || !spot) return;

    const label = STOCK_LABEL[stockPost.stockStatus] ?? stockPost.stockStatus;
    const body = `${gacha.seriesName}（${spot.name}）: ${label}`;

    let cursor: string | undefined;
    for (;;) {
      const favorites = await db.getGachaLikesForFanout(
        stockPost.gachaId,
        stockPost.userId,
        cursor,
        FANOUT_BATCH_SIZE,
      );
      if (favorites.length === 0) break;

      await db.createNotificationMany(
        favorites.map(({ userId }) => ({
          userId,
          type: 'favorite_stock',
          title: 'お気に入りの在庫情報',
          body,
          gachaId: stockPost.gachaId,
          spotId: stockPost.spotId,
          stockPostId: stockPost.id,
          actorId: stockPost.userId,
        })),
      );

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
    const p = await db.findPublicPost(targetId);
    return p ? { ownerId: p.userId, spotId: p.spotId } : null;
  }
  if (kind === 'stockPost') {
    const p = await db.findPublicStockPost(targetId);
    return p ? { ownerId: p.userId, spotId: p.spotId } : null;
  }
  const r = await db.findPublicSpotReview(targetId);
  return r ? { ownerId: r.userId, spotId: r.spotId } : null;
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

    const existing = await db.findLikeNotification({
      userId: target.ownerId,
      type: 'like',
      actorId,
      ...targetIdWhere(kind, targetId),
    });
    if (existing) return;

    const actor = await db.getUserById(actorId);
    await db.createNotification({
      userId: target.ownerId,
      type: 'like',
      title: 'いいねがつきました',
      body: `${actor?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}にいいねしました`,
      actorId,
      spotId: target.spotId ?? undefined,
      ...targetIdWhere(kind, targetId),
    });
  } catch (e) {
    console.error('[notifyLike]', e);
  }
}

/** いいね取り消し → 対応する既存のいいね通知を削除（type/actor/対象で一意に特定） */
export async function removeLikeNotification(kind: NotifyTargetKind, targetId: string, actorId: string) {
  try {
    await db.deleteLikeNotification({
      type: 'like',
      actorId,
      ...targetIdWhere(kind, targetId),
    });
  } catch (e) {
    console.error('[removeLikeNotification]', e);
  }
}

/**
 * 在庫報告への返信で @メンションされた相手へ通知する。
 * ・メンションは本文中の「@名前」。名前→userId は「その在庫報告の返信参加者」から解決する。
 * ・投稿主は除外（投稿主には notifyReply で別途通知が飛ぶため重複させない）。
 * ・自分自身（返信者）も除外。
 * @param stockPostId 対象の在庫報告ID
 * @param actorId     返信した人（＝メンションした人）
 * @param text        返信本文
 */
export async function notifyStockReplyMentions(stockPostId: string, actorId: string, text: string) {
  try {
    if (!text.includes('@')) return; // メンションが無ければ何もしない

    const post = await db.findPublicStockPost(stockPostId);
    if (!post) return; // 非公開/存在しない → 対象外
    const ownerId = post.userId;

    // 返信参加者を name→userId で用意（同名は先勝ち）。名前解決はこの参加者集合で行う。
    const replies = await db.listStockPostReplies(stockPostId);
    const nameToUid = new Map<string, string>();
    for (const r of replies) {
      if (r.user?.name && r.user?.id && !nameToUid.has(r.user.name)) {
        nameToUid.set(r.user.name, r.user.id);
      }
    }
    if (nameToUid.size === 0) return;

    // 本文から「@名前」を検出。長い名前を優先（renderWithMentions と同じ考え方で部分一致の誤検出を防ぐ）。
    const escaped = [...nameToUid.keys()]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp('@(' + escaped.join('|') + ')', 'g');

    const mentioned = new Set<string>();
    for (const m of text.matchAll(re)) {
      const uid = nameToUid.get(m[1]);
      if (uid) mentioned.add(uid);
    }
    // 投稿主・自分自身は除外
    mentioned.delete(ownerId);
    mentioned.delete(actorId);
    if (mentioned.size === 0) return;

    const actor = await db.getUserById(actorId);
    const excerpt = text.length > 30 ? `${text.slice(0, 30)}…` : text;

    await db.createNotificationMany(
      [...mentioned].map((userId) => ({
        userId,
        type: 'mention',
        title: 'メンションされました',
        body: `${actor?.name ?? 'だれか'}さんが在庫報告の返信であなたをメンションしました：${excerpt}`,
        actorId,
        stockPostId,
        spotId: post.spotId ?? undefined,
      })),
    );
  } catch (e) {
    console.error('[notifyStockReplyMentions]', e);
  }
}

/** 返信 → 投稿主へ（自分の投稿への自分の返信は通知しない） */
export async function notifyReply(kind: NotifyTargetKind, targetId: string, actorId: string, text: string) {
  try {
    const target = await resolveTarget(kind, targetId);
    if (!target || target.ownerId === actorId) return;
    const actor = await db.getUserById(actorId);
    const excerpt = text.length > 30 ? `${text.slice(0, 30)}…` : text;
    await db.createNotification({
      userId: target.ownerId,
      type: 'reply',
      title: '返信がきました',
      body: `${actor?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}に返信しました：${excerpt}`,
      actorId,
      spotId: target.spotId ?? undefined,
      ...targetIdWhere(kind, targetId),
    });
  } catch (e) {
    console.error('[notifyReply]', e);
  }
}
