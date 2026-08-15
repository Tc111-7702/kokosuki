import * as db from '@/lib/db';

// ─── エリア設定 ──────────────────────────────────────────────────────────────
// 追加したいエリアをここに1行足すだけでスクレイプ対象が広がります
// 例: { pref: 'tokyo', label: '東京' }
export const TARGET_AREAS = [
  { pref: 'osaka',    label: '大阪' },
  { pref: 'hyogo',    label: '兵庫' },
  { pref: 'kyoto',    label: '京都' },
  { pref: 'nara',     label: '奈良' },
  { pref: 'shiga',    label: '滋賀' },
  { pref: 'wakayama', label: '和歌山' },
] as const;

const WP_API    = 'https://gacha-island.jp/wp-json/wp/v2';
const SHOP_BASE = 'https://gacha-island.jp/shops';
const UA        = { 'User-Agent': 'mikke-scraper/1.0' };

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface WpTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

interface WpPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  class_list?: string[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
    'wp:term'?: WpTerm[][];
  };
}

export interface AreaSyncResult {
  area: string;
  stores: number;
  gachaSaved: number;
  machineSaved: number;
  skipped: number;
  errors: string[];
  seenGachaIds: string[];  // このエリアで発見したガチャID（スイープ用）
}

export interface ShopSyncResult {
  areas: AreaSyncResult[];
  totalGachaSaved: number;
  totalMachineSaved: number;
  totalErrors: number;
  ended: number;  // 今回スイープで終了扱いにしたガチャ数
}

// ─── HTML パーサー ─────────────────────────────────────────────────────────────

function extractClass(classList: string[], prefix: string): string | null {
  const hit = classList.find((c) => c.startsWith(`${prefix}-`));
  return hit ? hit.slice(prefix.length + 1) : null;
}

/**
 * 価格を抽出。ページ形式 "価格: 400円(税込)" とテーブル形式 "価格<\/th><td>..." の両方に対応。
 */
function parsePrice(html: string): number | null {
  // ページ形式: "価格: 400円(税込)"
  const page = html.match(/価格:\s*([\d,]+)円/);
  if (page) return parseInt(page[1].replace(/,/g, ''), 10);
  // テーブル形式（旧フォーマット）
  const table = html.match(/価格<\/th>\s*<td[^>]*>([^<]+)/);
  if (table) {
    const num = table[1].match(/(\d[\d,]*)/);
    if (num) return parseInt(num[1].replace(/,/g, ''), 10);
  }
  return null;
}

function parseLineup(html: string): string[] {
  const h4Match = html.match(/<h4[^>]*>商品内容<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/);
  const tdMatch = html.match(/商品内容<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/);
  const raw = (h4Match ?? tdMatch)?.[1];
  if (!raw) return [];
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
    .split(/\n/)
    .map((s) => s.replace(/^[・\s]+/, '').trim())
    .filter(Boolean);
}

/**
 * 発売日を抽出。以下の3形式に対応:
 *   1. "発売日: 2026年3月"         → その月の1日 00:00 JST
 *   2. "発売日<\/th><td>2026年03月01日"  → その日 00:00 JST
 *   3. "発売日<\/th><td>2026年03月01日 12時00分" → その時刻 JST
 */
function parseReleaseDate(html: string): Date | null {
  // 形式1: ページメタ "発売日: YYYY年M月"（日付なし）
  const meta = html.match(/発売日:\s*(\d{4})年(\d{1,2})月/);
  if (meta) {
    const y = meta[1];
    const m = meta[2].padStart(2, '0');
    return new Date(`${y}-${m}-01T00:00:00+09:00`);
  }
  // 形式2/3: テーブル "発売日<\/th><td>..."
  const table = html.match(/発売日<\/th>\s*<td>([^<]+)<\/td>/);
  if (!table) return null;
  const full = table[1].match(/(\d{4})年(\d{2})月(\d{2})日[^0-9]*(\d{2})時(\d{2})分/);
  if (full) return new Date(`${full[1]}-${full[2]}-${full[3]}T${full[4]}:${full[5]}:00+09:00`);
  const dateOnly = table[1].match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (dateOnly) return new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00+09:00`);
  return null;
}

function extractIpName(wpTerms: WpTerm[][]): string {
  const categories = wpTerms.flat().filter((t) => t.taxonomy === 'category');
  const child = categories.find((c) => c.parent !== 0);
  if (child) return child.name;
  const parent = categories.find((c) => c.parent === 0);
  if (parent) return parent.name;
  return '不明';
}

function ipGradientFromName(ipName: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < ipName.length; i++) h = ipName.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return { from: `hsl(${hue} 70% 60%)`, to: `hsl(${(hue + 40) % 360} 65% 45%)` };
}

function toCategory(slug: string | null): string {
  if (!slug) return 'other';
  if (['figure', 'mini-figure', 'mascot'].includes(slug)) return 'character';
  return 'other';
}

// ─── WP REST API で個別記事を取得 ─────────────────────────────────────────────

async function fetchWpPost(wpPostId: number): Promise<WpPost | null> {
  try {
    const res = await fetch(`${WP_API}/posts/${wpPostId}?_embed`, {
      headers: UA,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * 個別ガチャページのHTMLを取得。
 * WP REST API の content.rendered には発売日・価格のメタ情報が含まれないため、
 * 実際のページHTMLから parsePrice / parseReleaseDate で取得する。
 */
async function fetchPageHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate: 0 } });
    return res.ok ? res.text() : '';
  } catch {
    return '';
  }
}

// ─── 店舗ページから入荷中 wpPostId を抽出 ─────────────────────────────────────

async function fetchWpPostIdsForShop(pref: string, shopId: number): Promise<number[]> {
  try {
    const res = await fetch(`${SHOP_BASE}/${pref}/${shopId}/`, {
      headers: UA,
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    // <a href="https://gacha-island.jp/40258/" class="gacha-arrival-table-link">
    const matches = [...html.matchAll(/gacha-island\.jp\/(\d{4,})\//g)];
    return [...new Set(matches.map((m) => parseInt(m[1])))].filter((id) => id > 0);
  } catch {
    return [];
  }
}

// ─── 都道府県の全店舗 ID を取得 ────────────────────────────────────────────────

async function fetchShopIdsForPref(pref: string): Promise<number[]> {
  const ids: number[] = [];

  const firstHtml = await fetch(`${SHOP_BASE}/${pref}/`, { headers: UA }).then((r) => r.text());
  const pageNums = [...firstHtml.matchAll(/page\/(\d+)\//g)].map((m) => parseInt(m[1]));
  const maxPage  = pageNums.length > 0 ? Math.max(...pageNums) : 1;

  for (let page = 1; page <= maxPage; page++) {
    const url  = page === 1 ? `${SHOP_BASE}/${pref}/` : `${SHOP_BASE}/${pref}/page/${page}/`;
    const html = await fetch(url, { headers: UA }).then((r) => r.text());
    const re   = new RegExp(`/shops/${pref}/(\\d+)/`, 'g');
    for (const m of html.matchAll(re)) {
      const id = parseInt(m[1]);
      if (!ids.includes(id)) ids.push(id);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return ids;
}

// ─── WpPost → Gacha upsert、gachaId を返す ────────────────────────────────────

async function upsertGachaFromPost(post: WpPost): Promise<string> {
  const classList = post.class_list ?? [];
  const wpTerms   = post._embedded?.['wp:term'] ?? [];
  const ipName    = extractIpName(wpTerms);
  const makerSlug = extractClass(classList, 'manufacturer');
  const ptSlug    = extractClass(classList, 'product_type');
  const category  = toCategory(ptSlug);
  const imageUrl  = post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null;
  const { from, to } = ipGradientFromName(ipName);

  // 価格・発売日・ラインナップは実際のページHTMLから取得
  // （WP REST API の content.rendered にはこれらのメタ情報が含まれない）
  const pageHtml    = await fetchPageHtml(post.link);
  const price       = parsePrice(pageHtml) ?? 300;
  const lineup      = parseLineup(pageHtml);
  const releaseDate = parseReleaseDate(pageHtml);
  const status      = 'on_sale'; // 在庫ベース: 店舗にある = 発売中（releaseDate の日付は status に使わない）

  const gacha = await db.upsertGachaFromScraper({
    seriesName:   post.title.rendered,
    ipName,
    category,
    status,
    price,
    gradientFrom: from,
    gradientTo:   to,
    genre:        ptSlug,
    maker:        makerSlug,
    imageUrl,
    releaseDate,
    sourceUrl:    post.link,
    wpPostId:     post.id,
    lineup,
    isOnSale:     true,  // 店舗に設置済み = 発売中
  });

  return gacha.id;
}

// ─── 1 エリアの同期 ───────────────────────────────────────────────────────────

async function syncArea(pref: string, label: string): Promise<AreaSyncResult> {
  let gachaSaved   = 0;
  let machineSaved = 0;
  let skipped      = 0;
  const errors: string[] = [];
  const seenGachaIds: string[] = [];  // このエリアで発見したガチャID

  const shopIds = await fetchShopIdsForPref(pref);
  console.log(`[shop-sync] ${label}: ${shopIds.length} 店舗`);

  for (const shopId of shopIds) {
    // Spot が DB に登録済みか確認（未登録 = geocoding 未実施 → スキップ）
    const spot = await db.findSpotByGachaIslandId(shopId);
    if (!spot) { skipped++; continue; }

    const wpPostIds = await fetchWpPostIdsForShop(pref, shopId);

    for (const wpPostId of wpPostIds) {
      try {
        // Gacha: wpPostId で重複排除。未登録なら WP API で取得して upsert
        let gacha = await db.findGachaByWpPostId(wpPostId);

        if (!gacha) {
          const post = await fetchWpPost(wpPostId);
          if (!post) { skipped++; continue; }
          const gachaId = await upsertGachaFromPost(post);
          gacha = { id: gachaId } as Awaited<ReturnType<typeof db.findGachaByWpPostId>>;
          gachaSaved++;
          await new Promise((r) => setTimeout(r, 300)); // WP API 取得後の待機
        }

        // 今回発見したガチャIDを記録（スイープ用）
        if (gacha && !seenGachaIds.includes(gacha.id)) {
          seenGachaIds.push(gacha.id);
        }

        // Machine: Spot × Gacha のリンク（@@unique で自動重複排除）
        await db.upsertMachine(spot.id, gacha!.id);
        machineSaved++;
      } catch (e) {
        skipped++;
        errors.push(`${label} shop=${shopId} wpPost=${wpPostId}: ${String(e)}`);
      }
    }

    await new Promise((r) => setTimeout(r, 200)); // 店舗間の待機
  }

  return { area: label, stores: shopIds.length, gachaSaved, machineSaved, skipped, errors, seenGachaIds };
}

// ─── メインエントリ ───────────────────────────────────────────────────────────

export async function syncShopGachas(): Promise<ShopSyncResult> {
  // ── スイープ用: スクレイプ前に現在 isOnSale:true のガチャIDを全取得 ──
  const prevOnSaleIds = await db.getOnSaleGachaIds();
  console.log(`[shop-sync] スイープ対象: ${prevOnSaleIds.length} 件`);

  const areas: AreaSyncResult[] = [];

  for (const { pref, label } of TARGET_AREAS) {
    console.log(`[shop-sync] === ${label} 開始 ===`);
    const result = await syncArea(pref, label);
    areas.push(result);
    console.log(
      `[shop-sync] ${label} 完了: gacha=${result.gachaSaved} machine=${result.machineSaved} skip=${result.skipped} err=${result.errors.length}`,
    );
    await new Promise((r) => setTimeout(r, 500)); // エリア間の待機
  }

  // 今回全エリアで発見したガチャID（在庫更新・スイープ両方で使う）
  const seenIdSet = new Set(areas.flatMap((a) => a.seenGachaIds));

  // ── 発見したガチャは在庫あり(発売中)に更新（スケジュール登録で isOnSale=false のままだったものも是正） ──
  const seenIds = [...seenIdSet];
  if (seenIds.length > 0) {
    await db.markGachasInStore(seenIds);
    console.log(`[shop-sync] 在庫更新: ${seenIds.length} 件を on_sale に更新`);
  }

  // ── スイープ: 今回発見されなかったガチャを ended に更新 ──
  const endedIds  = prevOnSaleIds.filter((id) => !seenIdSet.has(id));
  if (endedIds.length > 0) {
    await db.markGachasEnded(endedIds);
    console.log(`[shop-sync] スイープ完了: ${endedIds.length} 件を ended に更新`);
  }

  return {
    areas,
    totalGachaSaved:   areas.reduce((s, a) => s + a.gachaSaved, 0),
    totalMachineSaved: areas.reduce((s, a) => s + a.machineSaved, 0),
    totalErrors:       areas.reduce((s, a) => s + a.errors.length, 0),
    ended: endedIds.length,
  };
}
