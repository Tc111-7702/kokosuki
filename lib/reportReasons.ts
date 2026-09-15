/** 記録・投稿の通報理由（kokosuki-admin 側にも同内容を保持すること） */
export const CONTENT_REPORT_REASONS = [
  { key: 'offensive_inappropriate', name: '攻撃的・不適切な内容' },
  { key: 'personal_info', name: '個人情報が含まれている' },
  { key: 'misleading', name: '虚偽・誤解を招く情報' },
  { key: 'promotion', name: '宣伝・勧誘・売買への誘導' },
  { key: 'store_rule_violation', name: '店舗ルールに反している' },
  { key: 'secret_not_hidden', name: 'シークレットが隠されていない' },
  { key: 'other', name: 'その他' },
] as const;

/** ユーザー自体の通報理由 */
export const USER_REPORT_REASONS = [
  { key: 'harassment', name: '嫌がらせ・迷惑行為' },
  { key: 'impersonation', name: 'なりすまし' },
  { key: 'inappropriate_profile', name: '不適切なプロフィール' },
  { key: 'repeated_misinformation', name: '虚偽情報の繰り返し' },
  { key: 'promotion', name: '宣伝・勧誘・売買への誘導' },
  { key: 'other', name: 'その他' },
] as const;

export type ContentReportReasonKey = (typeof CONTENT_REPORT_REASONS)[number]['key'];
export type UserReportReasonKey = (typeof USER_REPORT_REASONS)[number]['key'];
export type ReportReasonKey = ContentReportReasonKey | UserReportReasonKey;

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
export const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

const contentReasonKeySet = new Set<string>(CONTENT_REPORT_REASONS.map((r) => r.key));
const userReasonKeySet = new Set<string>(USER_REPORT_REASONS.map((r) => r.key));
const targetTypeSet = new Set<string>(REPORT_TARGET_TYPES);

export function isUserReportTarget(targetType: ReportTargetType): boolean {
  return targetType === 'user';
}

export function getReportReasonsForTarget(targetType: ReportTargetType) {
  return isUserReportTarget(targetType) ? USER_REPORT_REASONS : CONTENT_REPORT_REASONS;
}

export function isReportReasonKeyForTarget(key: string, targetType: ReportTargetType): key is ReportReasonKey {
  const set = isUserReportTarget(targetType) ? userReasonKeySet : contentReasonKeySet;
  return set.has(key);
}

export function validateReportReasonKeys(targetType: ReportTargetType, keys: string[]): boolean {
  if (keys.length === 0) return false;
  return keys.every((k) => isReportReasonKeyForTarget(k, targetType));
}

export function isReportTargetType(type: string): type is ReportTargetType {
  return targetTypeSet.has(type);
}

export function reportReasonName(key: string, targetType: ReportTargetType): string {
  return getReportReasonsForTarget(targetType).find((r) => r.key === key)?.name ?? key;
}
