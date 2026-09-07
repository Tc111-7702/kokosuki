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

// 1件の通知に保持するいいね者IDの上限（実人数カウントもここで頭打ち）
const LIKE_ACTOR_STORE_CAP = 50;

/**
 * いいね → 投稿主へ（自分の投稿への自分のいいねは通知しない）。
 * 1投稿につき通知は1件に保ち、いいね者を actorIds 配列に蓄積して update する
 * （削除して作り直さないので通知IDは不変。閲覧中の画面が同じIDのまま差し替えできる）。
 */
export async function notifyLike(kind: NotifyTargetKind, targetId: string, actorId: string) {
  try {
    const target = await resolveTarget(kind, targetId);
    if (!target || target.ownerId === actorId) return;

    const actor = await db.getUserById(actorId);
    const body = `${actor?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}にいいねしました`;

    // 対象・受信者が同じ既存いいね通知（いいね者は誰でも）を探す
    const existing = await db.findLikeNotification({
      userId: target.ownerId,
      type: 'like',
      ...targetIdWhere(kind, targetId),
    });

    if (existing) {
      // 既存のいいね者一覧（actorIds 無しの旧データは actorId で補完）に今回の人を先頭追加
      const prev = existing.actorIds.length
        ? existing.actorIds
        : (existing.actorId ? [existing.actorId] : []);
      const actorIds = [actorId, ...prev.filter((a) => a !== actorId)].slice(0, LIKE_ACTOR_STORE_CAP);
      await db.updateNotification(existing.id, {
        actorId,       // 最新のいいね者（左アバター用）
        actorIds,      // いいね者一覧（新しい順）
        body,
        read: false,
        createdAt: new Date(),
      });
      return;
    }

    await db.createNotification({
      userId: target.ownerId,
      type: 'like',
      title: 'いいねがつきました',
      body,
      actorId,
      actorIds: [actorId],
      spotId: target.spotId ?? undefined,
      ...targetIdWhere(kind, targetId),
    });
  } catch (e) {
    console.error('[notifyLike]', e);
  }
}

/**
 * いいね取り消し → その対象のいいね通知から当該ユーザーを外す。
 *  - 残りが 0 人になったら通知ごと削除。
 *  - 残っていれば actorIds を更新し、先頭（=左アバター）と本文も最新の残存者に合わせる。
 * （過去の「1いいね1行」データにも対応するため対象の全いいね通知を走査する）
 */
export async function removeLikeNotification(kind: NotifyTargetKind, targetId: string, actorId: string) {
  try {
    const notifs = await db.listLikeNotifications({
      type: 'like',
      ...targetIdWhere(kind, targetId),
    });

    for (const n of notifs) {
      const list = n.actorIds.length ? n.actorIds : (n.actorId ? [n.actorId] : []);
      if (!list.includes(actorId)) continue; // この通知には含まれない

      const remaining = list.filter((a) => a !== actorId);
      if (remaining.length === 0) {
        await db.deleteLikeNotification({ id: n.id });
        continue;
      }
      const head = remaining[0];
      const headUser = await db.getUserById(head);
      await db.updateNotification(n.id, {
        actorId: head,
        actorIds: remaining,
        body: `${headUser?.name ?? 'だれか'}さんがあなたの${TARGET_LABEL[kind]}にいいねしました`,
      });
    }
  } catch (e) {
    console.error('[removeLikeNotification]', e);
  }
}

// 本文から @handle（[A-Za-z0-9_]）を抽出（重複除去）
function extractHandles(text: string): string[] {
  const handles = new Set<string>();
  for (const m of text.matchAll(/@([A-Za-z0-9_]+)/g)) handles.add(m[1]);
  return [...handles];
}

/**
 * 返信内のメンション → メンションされた本人へ。
 *  - 投稿主は除外（返信通知(notifyReply)で既に届くため）。
 *  - 返信者本人（自己メンション）も除外。
 */
export async function notifyMention(kind: NotifyTargetKind, targetId: string, actorId: string, text: string) {
  try {
    const handles = extractHandles(text);
    if (handles.length === 0) return;

    const target = await resolveTarget(kind, targetId);
    if (!target) return;

    const users = await db.getUsersByHandles(handles);
    const recipients = users.filter(
      (u) => u.id !== actorId && u.id !== target.ownerId,
    );
    if (recipients.length === 0) return;

    const actor = await db.getUserById(actorId);
    const excerpt = text.length > 30 ? `${text.slice(0, 30)}…` : text;

    await db.createNotificationMany(
      recipients.map((u) => ({
        userId: u.id,
        type: 'mention',
        title: 'メンションされました',
        body: `${actor?.name ?? 'だれか'}さんが${TARGET_LABEL[kind]}の返信であなたをメンションしました：${excerpt}`,
        actorId,
        spotId: target.spotId ?? undefined,
        ...targetIdWhere(kind, targetId),
      })),
    );
  } catch (e) {
    console.error('[notifyMention]', e);
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
