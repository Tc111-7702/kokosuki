/** お知らせ公開ステータス（admin 用。kokosuki-admin 側にも同内容を保持すること） */
export const ANNOUNCEMENT_STATUSES = ['draft', 'published'] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

const statusSet = new Set<string>(ANNOUNCEMENT_STATUSES);

export function isAnnouncementStatus(value: string): value is AnnouncementStatus {
  return statusSet.has(value);
}

export const ANNOUNCEMENT_TITLE_MIN = 1;
export const ANNOUNCEMENT_TITLE_MAX = 200;
export const ANNOUNCEMENT_BODY_MIN = 1;
export const ANNOUNCEMENT_BODY_MAX = 10000;

export function validateAnnouncementTitle(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length >= ANNOUNCEMENT_TITLE_MIN && trimmed.length <= ANNOUNCEMENT_TITLE_MAX;
}

export function validateAnnouncementBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length >= ANNOUNCEMENT_BODY_MIN && trimmed.length <= ANNOUNCEMENT_BODY_MAX;
}
