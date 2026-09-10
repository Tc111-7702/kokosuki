import type { ReportTargetType } from '@/lib/reportReasons';

export function reportPath(targetType: ReportTargetType, targetId: string): string {
  return `/report/${targetType}/${targetId}`;
}

export function replyReportTargetType(postType: 'post' | 'stock' | 'review'): ReportTargetType {
  switch (postType) {
    case 'post':
      return 'post_reply';
    case 'stock':
      return 'stock_post_reply';
    case 'review':
      return 'spot_review_reply';
  }
}
