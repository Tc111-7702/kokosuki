import * as db from '@/lib/db';

const SCHEDULE_BASE = 'https://gacha-island.jp/gacha-release-schedule';
const WP_API        = 'https://gacha-island.jp/wp-json/wp/v2';
const UA            = { 'User-Agent': 'mikke-scraper/1.0' };

// ─── 対象月を算出（今月・来月）────────────────────────────────────────────────

function targetMonths(): Array<{ year: number; month: number }> {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1; // 1-indexed
  const next = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  return [{ year: y, month: m }, next];
}

/** "release202607" 形式のスラッグを生成 */
function monthSlug(year: number, month: number): string {
  return `release${year}${String(month).padStart(2, '0')}`;
}

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

export interface ScheduleSyncResult {
  saved: number;
  skipped: number;
  errors: string[];
}

// ─── HTML パーサー ─────────────────────────────────────────────────────────────

function extractClass(classList: string[], prefix: string): string | null {
  const hit = classList.find((c) => c.startsWith(`${prefix}-`));
  return hit ? hit.slice(prefix.length + 1) : null;
}

/** "価格: 400円(税込)" および旧テーブル形式の両方に対応 */
function parsePrice(html: string): number | null {
  const page = html.match(/価格:\s*([\d,]+)円/);
  if (page) return parseInt(page[1].replace(/,/g, ''), 10);
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
 * 発売日を抽出。3形式に対応:
 *   1. "発売日: 2026年3月"      → その月の1日 00:00 JST
 *   2. "発売日<\/th><td>YYYY年MM月DD日"  → その日 JST
 *   3. "発売日<\/th><td>...日 HH時MM分"  → その時刻 JST
 */
function parseReleaseDate(html: string): Date | null {
  const meta = html.match(/発売日:\s*(\d{4})年(\d{1,2})月/);
  if (meta) {
    return new Date(`${meta[1]}-${meta[2].padStart(2, '0')}-01T00:00:00+09:00`);
  }
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

// ─── フェッチ ─────────────────────────────────────────────────────────────────

/** 月別スケジュールページから wpPostId を抽出 */
async function fetchWpPostIdsForMonth(year: number, month: number): Promise<number[]> {
  const slug = monthSlug(year, month);
  const url  = `${SCHEDULE_BASE}/${slug}/`;
  try {
    const res  = await fetch(url, { headers: UA, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const html = await res.text();
    // <a href="https://gacha-island.jp/44161/" class="p-postList__link">
    const matches = [...html.matchAll(/href="https:\/\/gacha-island\.jp\/(\d{4,})\/" class="p-postList__link"/g)];
    return [...new Set(matches.map((m) => parseInt(m[1])))];
  } catch {
    return [];
  }
}

/** WP REST API で個別記事のメタ情報を取得 */
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

/** 個別ガチャページのHTMLを取得（価格・発売日・ラインナップ用） */
async function fetchPageHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate: 0 } });
    return res.ok ? res.text() : '';
  } catch {
    return '';
  }
}

// ─── メインエントリ ───────────────────────────────────────────────────────────

export async function syncScheduleGachas(): Promise<ScheduleSyncResult> {
  let saved   = 0;
  let skipped = 0;
  const errors: string[] = [];

  const months = targetMonths();
  console.log(`[schedule-sync] 対象月: ${months.map((m) => `${m.year}年${m.month}月`).join(', ')}`);

  for (const { year, month } of months) {
    const label     = `${year}年${month}月`;
    const wpPostIds = await fetchWpPostIdsForMonth(year, month);
    console.log(`[schedule-sync] ${label}: ${wpPostIds.length}件`);

    for (const wpPostId of wpPostIds) {
      try {
        // すでに店舗スクレイパーで isOnSale: true で登録済みならスキップ
        const existing = await db.findGachaByWpPostId(wpPostId);
        if (existing?.isOnSale) {
          skipped++;
          continue;
        }

        // WP REST API でメタ情報を取得
        const post = await fetchWpPost(wpPostId);
        if (!post) { skipped++; continue; }

        // 個別ページHTMLで価格・発売日・ラインナップを取得
        const pageHtml    = await fetchPageHtml(post.link);
        const price       = parsePrice(pageHtml) ?? 300;
        const lineup      = parseLineup(pageHtml);
        const releaseDate = parseReleaseDate(pageHtml);
        const status      = 'coming_soon'; // 在庫ベース: 店舗にない発売スケジュール由来 = これから発売

        const classList = post.class_list ?? [];
        const wpTerms   = post._embedded?.['wp:term'] ?? [];
        const ipName    = extractIpName(wpTerms);
        const makerSlug = extractClass(classList, 'manufacturer');
        const ptSlug    = extractClass(classList, 'product_type');
        const category  = toCategory(ptSlug);
        const imageUrl  = post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null;
        const { from, to } = ipGradientFromName(ipName);

        await db.upsertGachaFromScraper({
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
          isOnSale:     false,  // 発売スケジュールからの登録 = まだ店舗にない
        });

        saved++;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        skipped++;
        errors.push(`wpPost=${wpPostId}: ${String(e)}`);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return { saved, skipped, errors };
}
