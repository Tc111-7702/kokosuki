import * as db from '@/lib/db';

// #19 IP正規化の共通ロジック。
// - カテゴリは「各ガチャの WP category term を根まで辿ったトップ親」→ 固定4カテゴリ(+other)へ写像。
// - IpName は「スクレイプで得た ipName 文字列」だけを登録（トップ親カテゴリ名＝ジャンルは除外）。
// - 2つのスクレイパー・後処理・backfill で共有する。

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

/**
 * 後処理: 全ガチャの (ipName, ipCategory) から IpName/IpCategory を構築し、Gacha.ipNameId を link する。
 * ipCategory は各スクレイパーが per-gacha で保存済み（key 文字列）である前提。WP へはアクセスしない（高速）。
 */
export async function syncIpNameTable(): Promise<{ ipNames: number; excluded: number; linked: number }> {
  const tree = await fetchWpCategoryTree();
  const topNames = topParentNames(tree);
  const idByKey = await upsertIpCategories();

  const gachas = await db.getAllGachaIpInfo();

  // ipName → 最優先 categoryKey（配下ガチャの ipCategory を優先順位で集約）
  const catByIp = new Map<string, string>();
  let excluded = 0;
  for (const g of gachas) {
    if (isExcludedIpName(g.ipName, topNames)) { excluded++; continue; } // 自転車・スケボー等は除外
    const key = idByKey[g.ipCategory] ? g.ipCategory : 'other';         // ipCategory を key として扱う
    const cur = catByIp.get(g.ipName);
    if (!cur || rank(key) < rank(cur)) catByIp.set(g.ipName, key);
  }

  // IpName upsert
  const ipNameId = new Map<string, string>();
  for (const [name, key] of catByIp) {
    const row = await db.upsertIpName(name, idByKey[key] ?? idByKey.other);
    ipNameId.set(name, row.id);
  }

  // Gacha.ipNameId を link（除外 ipName の分は null のまま）
  let linked = 0;
  for (const g of gachas) {
    const id = ipNameId.get(g.ipName) ?? null;
    await db.setGachaIpNameId(g.id, id);
    if (id) linked++;
  }

  return { ipNames: ipNameId.size, excluded, linked };
}
