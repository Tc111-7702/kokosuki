/** 問い合わせ対応ステータス（admin 用。mikke-admin 側にも同内容を保持すること） */
export const INQUIRY_STATUSES = ['pending', 'reviewing', 'resolved'] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

const statusSet = new Set<string>(INQUIRY_STATUSES);

export function isInquiryStatus(value: string): value is InquiryStatus {
  return statusSet.has(value);
}

export const INQUIRY_BODY_MIN = 1;
export const INQUIRY_BODY_MAX = 2000;

export function validateInquiryBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length >= INQUIRY_BODY_MIN && trimmed.length <= INQUIRY_BODY_MAX;
}
