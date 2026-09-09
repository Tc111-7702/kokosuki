/** モバイル共通ヘッダー寸法（home / home/search で px 完全一致） */
export const MOBILE_HEADER_PADDING_TOP = 48;
export const MOBILE_HEADER_TITLE_ROW_HEIGHT = 40;   // 戻る行: 32px ボタン + 下余白 8px 相当
export const MOBILE_HEADER_SEARCH_BAR_HEIGHT = 56; // HomeSearchBar ブロック
export const MOBILE_HEADER_CONTENT_HEIGHT =
  MOBILE_HEADER_TITLE_ROW_HEIGHT + MOBILE_HEADER_SEARCH_BAR_HEIGHT; // 96

/** ホームのみ: タブ行を content 96px 内に収める */
export const MOBILE_HOME_TAB_ROW_HEIGHT = 36;
export const MOBILE_HOME_LOGO_ZONE_HEIGHT =
  MOBILE_HEADER_CONTENT_HEIGHT - MOBILE_HOME_TAB_ROW_HEIGHT; // 60
