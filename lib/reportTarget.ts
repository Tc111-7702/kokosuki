import * as db from '@/lib/db';
import type { ReportTargetType } from '@/lib/reportReasons';

/** 通報対象から被通報ユーザー id を解決する */
export async function resolveReportedUserId(
  targetType: ReportTargetType,
  targetId: string,
): Promise<string | null> {
  switch (targetType) {
    case 'post': {
      const row = await db.findPostReportOwnerId(targetId);
      return row?.userId ?? null;
    }
    case 'stock_post': {
      const row = await db.findStockPostReportOwnerId(targetId);
      return row?.userId ?? null;
    }
    case 'post_reply': {
      const row = await db.findPostReplyReportOwnerId(targetId);
      return row?.userId ?? null;
    }
    case 'stock_post_reply': {
      const row = await db.findStockPostReplyReportOwnerId(targetId);
      return row?.userId ?? null;
    }
    case 'spot_review': {
      const row = await db.findSpotReviewReportOwnerId(targetId);
      return row?.userId ?? null;
    }
    case 'spot_review_reply': {
      const row = await db.findSpotReviewReplyReportOwnerId(targetId);
      return row?.userId ?? null;
    }
    case 'user': {
      const row = await db.findUserReportOwnerId(targetId);
      return row?.id ?? null;
    }
    default:
      return null;
  }
}
