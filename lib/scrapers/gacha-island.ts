import { db } from '@/lib/db';

export const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000;

const WP_BASE = 'https://gacha-island.jp/wp-json/wp/v2';

function extractClass(classList: string[], prefix: string): string | null {
  const hit = classList.find((c) => c.startsWith(`${prefix}-`));
  return hit ? hit.slice(prefix.length + 1) : null;
}

function parsePrice(html: string): number | null {
  const m = html.match(/価格<\/th>\s*<td[^>]*>([^<]+)/);
  if (m) {
    const num = m[1].match(/(\d[\d,]*)/);
    if (num) return parseInt(num[1].replace(/,/g, ''), 10);
  }
  return null;
}

function parseLineup(html: string): string[] {
  const tableMatch = html.match(/商品内容<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/);
  if (!tableMatch) return [];
  const content = tableMatch[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
  return content
    .split(/[\n]/)
    .map((s) => s.replace(/^[・\s]+/, '').trim())
    .filter(Boolean);
}

async function fetchPostDetail(
  link: string,
): Promise<{ price: number | null; lineup: string[] }> {
  try {
    const res = await fetch(link, {
      headers: { 'User-Agent': 'mikke-scraper/1.0' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { price: null, lineup: [] };
    const html = await res.text();
    return { price: parsePrice(html), lineup: parseLineup(html) };
  } catch {
    return { price: null, lineup: [] };
  }
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

  let totalPages = maxPages ?? 1;

  for (let page = 1; page <= totalPages; page++) {
    const url = `${WP_BASE}/posts?per_page=100&page=${page}&_embed`;
    let posts: WpPost[];

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'mikke-scraper/1.0' },
        next: { revalidate: 0 },
      });
      if (res.status === 400) break;
      if (!res.ok) { errors.push(`Page ${page}: HTTP ${res.status}`); break; }

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

    console.log(`[gacha-island] ページ ${page}/${totalPages} 処理中 (${posts.length}件)`);

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

        let price  = parsePrice(post.content.rendered);
        let lineup = parseLineup(post.content.rendered);

        if (price === null || lineup.length === 0) {
          const detail = await fetchPostDetail(post.link);
          if (price === null)       price  = detail.price;
          if (lineup.length === 0)  lineup = detail.lineup;
          await new Promise((r) => setTimeout(r, 500));
        }

        await db.upsertGachaFromScraper({
          seriesName:   post.title.rendered,
          ipName,
          kind:         'gacha',
          category,
          status,
          price:        price ?? 300,
          gradientFrom: from,
          gradientTo:   to,
          genre:        ptSlug,
          maker:        makerSlug,
          imageUrl,
          releaseDate,
          sourceUrl:    post.link,
          wpPostId:     post.id,
          lineup,
        });
        saved++;
      } catch (e) {
        skipped++;
        errors.push(`Post ${post.id}: ${String(e)}`);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return { saved, skipped, errors };
}
