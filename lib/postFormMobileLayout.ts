/**
 * モバイル投稿フォーム：ガチャ選択ステップのコンテンツ高さ（px）
 * 検索バー + 区切り線 + 人気IPタグ(3行) + 次へボタン上余白(48)
 *
 * 内訳:
 *  検索バー       34  (paddingTop 6 + inner py 12 + input 16)
 *  区切り線       33.5 (margin 16 + border 1.5 + margin 16)
 *  人気IP見出し   19  (font 11 + marginBottom 8)
 *  タグ3行        92  (pill 26 × 3 + gap 7 × 2)
 *  次へ上余白     48
 *  ─────────────────
 *  合計          226.5 → 227
 */
export const POST_GACHA_BODY_HEIGHT = 227;
export const POST_STEP_NEXT_GAP = 48;
/** 店舗選択ステップ：次へボタン上余白（ガチャ選択より下に配置） */
export const POST_SPOT_STEP_NEXT_GAP = 96;
/** 次へボタン直前のコンテンツ下端まで（タグ列下 / 現在地ボタン下） */
export const POST_STEP_CONTENT_BOTTOM = POST_GACHA_BODY_HEIGHT - POST_STEP_NEXT_GAP; // 179
