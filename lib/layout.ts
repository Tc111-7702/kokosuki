import { Noto_Sans_JP, Zen_Maru_Gothic } from 'next/font/google';

// レイアウト関連の定数/フォントをまとめたモジュール
// （旧: loginFonts.ts / desktopPageNav.ts / mobileHeaderLayout.ts / postFormMobileLayout.ts）。

// ─── ログイン/スプラッシュ用フォント ─────────────────────────────────────────────

export const loginDisplayFont = Zen_Maru_Gothic({
  weight: ['700', '900'],
  variable: '--font-login-display',
  display: 'swap',
});

export const splashDisplayFont = Noto_Sans_JP({
  weight: ['900'],
  variable: '--font-splash-display',
  display: 'swap',
});

// ─── デスクトップ PageNav（左サイドバー）─────────────────────────────────────────

/** デスクトップ PageNav（左サイドバー）の幅 px */
export const DESKTOP_PAGE_NAV_WIDTH = 88;

// ─── モバイル共通ヘッダー寸法（home / home/search で px 完全一致）────────────────

export const MOBILE_HEADER_PADDING_TOP = 48;
export const MOBILE_HEADER_TITLE_ROW_HEIGHT = 40; // 戻る行: 32px ボタン + 下余白 8px 相当
export const MOBILE_HEADER_SEARCH_BAR_HEIGHT = 56; // HomeSearchBar ブロック
export const MOBILE_HEADER_CONTENT_HEIGHT =
  MOBILE_HEADER_TITLE_ROW_HEIGHT + MOBILE_HEADER_SEARCH_BAR_HEIGHT; // 96

/** ホームのみ: タブ行を content 96px 内に収める */
export const MOBILE_HOME_TAB_ROW_HEIGHT = 36;
export const MOBILE_HOME_LOGO_ZONE_HEIGHT =
  MOBILE_HEADER_CONTENT_HEIGHT - MOBILE_HOME_TAB_ROW_HEIGHT; // 60

// ─── モバイル投稿フォームのレイアウト寸法 ────────────────────────────────────────
//
// ガチャ選択ステップのコンテンツ高さ（px）
// 検索バー + 区切り線 + 人気IPタグ(3行) + 次へボタン上余白(48)
//  検索バー       34  (paddingTop 6 + inner py 12 + input 16)
//  区切り線       33.5 (margin 16 + border 1.5 + margin 16)
//  人気IP見出し   19  (font 11 + marginBottom 8)
//  タグ3行        92  (pill 26 × 3 + gap 7 × 2)
//  次へ上余白     48
//  合計          226.5 → 227

export const POST_GACHA_BODY_HEIGHT = 227;
export const POST_STEP_NEXT_GAP = 48;
/** 店舗選択ステップ：次へボタン上余白（ガチャ選択より下に配置） */
export const POST_SPOT_STEP_NEXT_GAP = 96;
/** 次へボタン直前のコンテンツ下端まで（タグ列下 / 現在地ボタン下） */
export const POST_STEP_CONTENT_BOTTOM = POST_GACHA_BODY_HEIGHT - POST_STEP_NEXT_GAP; // 179
