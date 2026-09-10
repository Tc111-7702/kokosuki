/** 通報理由（mikke-admin 側にも同内容を保持すること） */
export const REPORT_REASONS = [
  { key: 'spam', name: 'スパム・宣伝' },
  { key: 'harassment', name: '誹謗中傷・ハラスメント' },
  { key: 'inappropriate', name: '不適切な内容' },
  { key: 'misinformation', name: '虚偽・誤情報' },
  { key: 'impersonation', name: 'なりすまし' },
  { key: 'privacy', name: '個人情報の公開' },
  { key: 'other_violation', name: 'その他の規約違反' },
] as const;

export type ReportReasonKey = (typeof REPORT_REASONS)[number]['key'];

/** 通報対象の種別 */
export const REPORT_TARGET_TYPES = [
  'post',
  'stock_post',
  'post_reply',
  'stock_post_reply',
  'spot_review',
  'spot_review_reply',
  'user',
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** 通報対応ステータス（admin 用） */
export const REPORT_STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

const reasonKeySet = new Set<string>(REPORT_REASONS.map((r) => r.key));
const targetTypeSet = new Set<string>(REPORT_TARGET_TYPES);

export function isReportReasonKey(key: string): key is ReportReasonKey {
  return reasonKeySet.has(key);
}

export function isReportTargetType(type: string): type is ReportTargetType {
  return targetTypeSet.has(type);
}

export function reportReasonName(key: string): string {
  return REPORT_REASONS.find((r) => r.key === key)?.name ?? key;
}
