// ガチャガチャアイランド スクレイパー共通定数（URL・User-Agent・対象エリア）
// 各スクレイパー（shops / shop-sync / schedule）で重複していた定数をここに集約する。

/** WordPress REST API ベース */
export const WP_API = 'https://gacha-island.jp/wp-json/wp/v2';

/** 店舗一覧ページのベース */
export const SHOP_BASE = 'https://gacha-island.jp/shops';

/** 発売スケジュールページのベース */
export const SCHEDULE_BASE = 'https://gacha-island.jp/gacha-release-schedule';

/** Google Geocoding API（住所→緯度経度） */
export const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/** スクレイプ時の User-Agent */
export const UA = { 'User-Agent': 'mikke-scraper/1.0' };

/**
 * スクレイプ対象エリア（関西）。
 * 追加したいエリアはここに1行足すだけでスクレイプ対象が広がる。例: { pref: 'tokyo', label: '東京' }
 */
export const TARGET_AREAS = [
  { pref: 'osaka',    label: '大阪' },
  { pref: 'hyogo',    label: '兵庫' },
  { pref: 'kyoto',    label: '京都' },
  { pref: 'nara',     label: '奈良' },
  { pref: 'shiga',    label: '滋賀' },
  { pref: 'wakayama', label: '和歌山' },
] as const;

/** 都道府県スラッグのみ（TARGET_AREAS から導出） */
export const KANSAI_PREFS = TARGET_AREAS.map((a) => a.pref);
