import { db } from '@/lib/db';
import { createPoller } from '@/lib/polling';

// ────────────────────────────────────────────────
// ポーリング間隔（このファイルで一元管理）
// ────────────────────────────────────────────────
export const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24時間

const WP_BASE = 'https://gacha-island.jp/wp-json/wp/v2';

// ────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────

function extractClass(classList: string[], prefix: string): string | null {
  const hit = classList.find((c) => c.startsWith(`${prefix}-`));
  return hit ? hit.slice(prefix.length + 1) : null;
}

function parseReleaseDate(html: string): Date | null {
  const m = html.match(/発売日<\/th>\s*<td>([^<]+)<\/td>/);
  if (!m) return null;
  const full = m[1].match(/(\d{4})年(\d{2})月(\d{2})日[^0-9]*(\d{2})時(\d{2})分/);
  if (full) {
    return new Date(`${full[1]}-${full[2]}-${full[3]}T${full[4]}:${full[5]}:00+09:00`);
  }
  const dateOnly = m[1].match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (dateOnly) {
    return new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00+09:00`);
  }
  return null;
}

/**
 * wp:term から日本語のipName（カテゴリ表示名）を取得する。
 * 子カテゴリ（特定IP名）を優先し、なければ親カテゴリ名を使う。
 */
function extractIpName(wpTerms: WpTerm[][]): string {
  const categories = wpTerms.flat().filter((t) => t.taxonomy === 'category');
  // 子カテゴリ優先（parent !== 0）
  const child = categories.find((c) => c.parent !== 0);
  if (child) return child.name;
  // なければ親カテゴリ
  const parent = categories.find((c) => c.parent === 0);
  if (parent) return parent.name;
  return '不明';
}

function ipGradientFromName(ipName: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < ipName.length; i++) {
    h = ipName.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return {
    from: `hsl(${hue} 70% 60%)`,
    to: `hsl(${(hue + 40) % 360} 65% 45%)`,
  };
}

function toCategory(slug: string | null): string {
  if (!slug) return 'other';
  if (['figure', 'mini-figure', 'mascot'].includes(slug)) return 'character';
  return 'other';
}

// ────────────────────────────────────────────────
// WordPress REST API の型
// ────────────────────────────────────────────────
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
  class_list: string[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
    'wp:term'?: WpTerm[][];
  };
}

// ────────────────────────────────────────────────
// スクレイプ本体
// ────────────────────────────────────────────────
export interface ScrapeResult {
  saved: number;
  skipped: number;
  errors: string[];
}

export async function scrapeGachaIsland(
  maxPages?: number,
): Promise<ScrapeResult> {
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  // 1ページ目で総ページ数を取得し、maxPagesが未指定なら全ページ取得
  let totalPages = maxPages ?? 1;

  for (let page = 1; page <= totalPages; page++) {
    const url = `${WP_BASE}/posts?per_page=100&page=${page}&_embed`;
    let posts: WpPost[];

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'mikke-scraper/1.0' },
        next: { revalidate: 0 },
      });
      if (res.status === 400) break; // ページ超過 → 終了
      if (!res.ok) { errors.push(`Page ${page}: HTTP ${res.status}`); break; }

      // 1ページ目でX-WP-TotalPagesを読み取り、全件取得モード時に上限を更新
      if (page === 1 && maxPages === undefined) {
        const total = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);
        totalPages = isNaN(total) ? 1 : total;
        console.log(`[gacha-island] 総ページ数: ${totalPages}`);
      }

      posts = await res.json();
      if (posts.length === 0) break;
    } catch (e) {
      errors.push(`Page ${page}: fetch failed - ${String(e)}`);
      break;
    }

    for (const post of posts) {
      try {
        const classList = post.class_list ?? [];
        const wpTerms   = post._embedded?.['wp:term'] ?? [];
        const ipName    = extractIpName(wpTerms);
        const makerSlug = extractClass(classList, 'manufacturer');
        const ptSlug    = extractClass(classList, 'product_type');
        const category  = toCategory(ptSlug);
        const imageUrl  = post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null;
        const releaseDate = parseReleaseDate(post.content.rendered);
        const { from, to } = ipGradientFromName(ipName);
        const status = releaseDate && releaseDate > new Date() ? 'coming_soon' : 'on_sale';

        await db.upsertGachaFromScraper({
          seriesName:   post.title.rendered,
          ipName,
          kind:         'gacha',
          category,
          status,
          price:        300,
          gradientFrom: from,
          gradientTo:   to,
          maker:        makerSlug,
          imageUrl,
          releaseDate,
          sourceUrl:    post.link,
          wpPostId:     post.id,
        });
        saved++;
      } catch (e) {
        skipped++;
        errors.push(`Post ${post.id}: ${String(e)}`);
      }
    }

    // gacha-island.jp への負荷を抑える
    await new Promise((r) => setTimeout(r, 500));
  }

  return { saved, skipped, errors };
}

// ────────────────────────────────────────────────
// ポーラーインスタンス（通常時は最新2ページのみ取得）
// ────────────────────────────────────────────────
export const gachaIslandPoller = createPoller(
  () => scrapeGachaIsland(2).then((r) => {
    console.log(`[gachaIslandPoller] saved=${r.saved} skipped=${r.skipped}`);
  }),
  POLL_INTERVAL_MS,
);
