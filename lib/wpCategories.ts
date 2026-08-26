// ガチャアイランドのWPカテゴリツリーを参照して、ホームのカテゴリ別セクション用に
// 「キャラクター・マスコット」「アニメ・漫画・ゲーム」に属する ipName 一覧を返す。
// 登録画面のIP選択（/api/gacha/wp-categories）と同じソースなので分類が一致する。

const WP_API = 'https://gacha-island.jp/wp-json/wp/v2';
const UA = { 'User-Agent': 'Mozilla/5.0' };

// 親カテゴリ slug（安定した識別子。日本語名の表記ゆれに影響されない）
const CHARACTER_PARENT_SLUG = 'mascot';    // キャラクター・マスコット
const ANIME_PARENT_SLUG = 'anime-game';    // アニメ・漫画・ゲーム

interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

async function fetchAllCategories(): Promise<WpCategory[]> {
  const all: WpCategory[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${WP_API}/categories?per_page=100&page=${page}`, {
      headers: UA,
      next: { revalidate: 3600 }, // 1時間キャッシュ
    });
    if (!res.ok) break;
    const data = (await res.json()) as WpCategory[];
    if (!data.length) break;
    all.push(...data);
    page++;
  }
  return all;
}

// 親 slug に属する ipName 一覧（親カテゴリ名 ＋ その子カテゴリ名）
function ipNamesForParent(cats: WpCategory[], parentSlug: string): string[] {
  const parent = cats.find((c) => c.parent === 0 && c.slug === parentSlug);
  if (!parent) return [];
  const children = cats.filter((c) => c.parent === parent.id).map((c) => c.name);
  return [parent.name, ...children];
}

/** キャラクター・マスコット / アニメ・漫画・ゲーム に属する ipName 一覧を返す。 */
export async function getCategoryIpNames(): Promise<{ character: string[]; anime: string[] }> {
  const cats = await fetchAllCategories();
  return {
    character: ipNamesForParent(cats, CHARACTER_PARENT_SLUG),
    anime: ipNamesForParent(cats, ANIME_PARENT_SLUG),
  };
}
