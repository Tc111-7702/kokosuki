import * as db from '@/lib/db';

// #19 IP正規化の共通ロジック。
// - カテゴリは「各ガチャの WP category term を根まで辿ったトップ親」→ 固定4カテゴリ(+other)へ写像。
// - IpName は「スクレイプで得た ipName 文字列」だけを登録（トップ親カテゴリ名＝ジャンルは除外）。
// - スクレイプ時に resolveIpNameId で Gacha.ipNameId を link する（2つのスクレイパーで共有）。

const WP_API = 'https://gacha-island.jp/wp-json/wp/v2';
const UA = { 'User-Agent': 'Mozilla/5.0' };

// ── 固定カテゴリ（IpCategory の seed 元）。表示順＝この並び順（優先順位も同順: CATEGORY_PRIORITY）──
export const IP_CATEGORIES = [
  { key: 'character', name: 'キャラクター・マスコット', sortOrder: 0 },
  { key: 'anime',     name: 'アニメ・漫画・ゲーム',      sortOrder: 1 },
  { key: 'animal',    name: '動物',                    sortOrder: 2 },
  { key: 'food',      name: '食べ物',                  sortOrder: 3 },
  { key: 'other',     name: 'その他',                  sortOrder: 4 },
] as const;

// WP親slug → category key（上位4のみ。それ以外の親は該当なし＝other）
const SLUG_TO_KEY: Record<string, string> = {
  mascot: 'character', animal: 'animal', 'anime-game': 'anime', food: 'food',
};

// 優先順位（前ほど強い）。複数トップ親に属す時の勝ち。表示順(IP_CATEGORIES)と同順。
const CATEGORY_PRIORITY = ['character', 'anime', 'animal', 'food'] as const;
const rank = (key: string) => {
  const i = (CATEGORY_PRIORITY as readonly string[]).indexOf(key);
  return i === -1 ? Infinity : i; // other/該当なしは最弱
};

export interface WpCat { id: number; name: string; slug: string; parent: number; }
export type CatTree = Map<number, WpCat>;

/** WP全カテゴリを取得して id→cat のツリーに（walk-up 用） */
export async function fetchWpCategoryTree(): Promise<CatTree> {
  const map: CatTree = new Map();
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP_API}/categories?per_page=100&page=${page}`, { headers: UA });
    if (!res.ok) break;
    const data = (await res.json()) as WpCat[];
    if (!data.length) break;
    data.forEach((c) => map.set(c.id, c));
    if (data.length < 100) break;
  }
  return map;
}

/** トップ親カテゴリ名（parent===0）の集合 ＝ IpName 除外用 */
export function topParentNames(tree: CatTree): Set<string> {
  const s = new Set<string>();
  for (const c of tree.values()) if (c.parent === 0) s.add(c.name);
  return s;
}

/** category term id を根まで辿って category key（上位4に無ければ null） */
export function topCategoryKey(termId: number, tree: CatTree): string | null {
  let cur = tree.get(termId);
  const seen = new Set<number>();
  while (cur && cur.parent !== 0 && !seen.has(cur.id)) { seen.add(cur.id); cur = tree.get(cur.parent); }
  return cur ? (SLUG_TO_KEY[cur.slug] ?? null) : null; // ハローキティ→サンリオ→mascot→character
}

/** ガチャの category term id 群 → 優先順位で1つの key（無ければ 'other'） */
export function resolveGachaCategoryKey(catTermIds: number[], tree: CatTree): string {
  let best: string | null = null;
  for (const id of catTermIds) {
    const key = topCategoryKey(id, tree);
    if (key && (best === null || rank(key) < rank(best))) best = key;
  }
  return best ?? 'other';
}

/** IpName 除外判定（トップ親カテゴリ名＝ジャンル、'不明' は IpName にしない） */
export function isExcludedIpName(name: string, topNames: Set<string>): boolean {
  return name === '不明' || topNames.has(name);
}

/** IpCategory 5行を upsert し key→id を返す */
export async function upsertIpCategories(): Promise<Record<string, string>> {
  const idByKey: Record<string, string> = {};
  for (const c of IP_CATEGORIES) {
    const row = await db.upsertIpCategory(c.key, c.name, c.sortOrder);
    idByKey[c.key] = row.id;
  }
  return idByKey;
}

// IpCategory key→id のプロセス内キャッシュ（idempotent なので使い回してよい）。
let _idByKey: Record<string, string> | null = null;
async function ipCategoryIds(): Promise<Record<string, string>> {
  if (!_idByKey) _idByKey = await upsertIpCategories();
  return _idByKey;
}

/**
 * スクレイプ時に ipName を IpName テーブルへ解決し id を返す（除外 ipName は null）。
 * 既存があればより強いカテゴリのときだけ更新（弱くはしない＝優先順位を維持）。
 * これによりガチャ upsert 時点で Gacha.ipNameId が張られ、旧 ipName/ipCategory 列に依存しない。
 */
export async function resolveIpNameId(name: string, categoryKey: string, excluded: boolean): Promise<string | null> {
  if (excluded) return null;
  const idByKey = await ipCategoryIds();
  const catId = idByKey[categoryKey] ?? idByKey.other;
  const existing = await db.getIpNameByName(name);
  if (!existing) return (await db.upsertIpName(name, catId)).id;
  if (rank(categoryKey) < rank(existing.category.key)) await db.upsertIpName(name, catId);
  return existing.id;
}
