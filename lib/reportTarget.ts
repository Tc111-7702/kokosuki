import { prisma } from '@/lib/db';
import type { ReportTargetType } from '@/lib/reportReasons';

/** 通報対象から被通報ユーザー id を解決する */
export async function resolveReportedUserId(
  targetType: ReportTargetType,
  targetId: string,
): Promise<string | null> {
  switch (targetType) {
    case 'post': {
      const row = await prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'stock_post': {
      const row = await prisma.stockPost.findUnique({ where: { id: targetId }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'post_reply': {
      const row = await prisma.postReply.findUnique({ where: { id: targetId }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'stock_post_reply': {
      const row = await prisma.stockPostReply.findUnique({ where: { id: targetId }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'spot_review': {
      const row = await prisma.spotReview.findUnique({ where: { id: targetId }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'spot_review_reply': {
      const row = await prisma.spotReviewReply.findUnique({ where: { id: targetId }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'user': {
      const row = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      return row?.id ?? null;
    }
    default:
      return null;
  }
}
