import { NextResponse } from 'next/server';

const WP_API = 'https://gacha-island.jp/wp-json/wp/v2';
const UA = { 'User-Agent': 'Mozilla/5.0' };

async function fetchAllCategories() {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${WP_API}/categories?per_page=100&page=${page}`, {
      headers: UA,
      next: { revalidate: 3600 },
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!data.length) break;
    all.push(...data);
    page++;
  }
  return all;
}

export async function GET() {
  try {
    const cats = await fetchAllCategories();

    const parents = cats
      .filter((c: any) => c.parent === 0)
      .sort((a: any, b: any) => b.count - a.count);

    const childMap: Record<number, any[]> = {};
    for (const c of cats) {
      if (c.parent !== 0) {
        if (!childMap[c.parent]) childMap[c.parent] = [];
        childMap[c.parent].push(c);
      }
    }
    for (const arr of Object.values(childMap)) {
      arr.sort((a: any, b: any) => b.count - a.count);
    }

    // 上位4カテゴリはそのまま、5位以降はその他にまとめる
    const TOP_N = 4;
    const topSections = parents.slice(0, TOP_N).map((p: any) => ({
      id:       p.id,
      name:     p.name,
      count:    p.count,
      children: (childMap[p.id] ?? []).map((c: any) => ({ id: c.id, name: c.name, count: c.count })),
    }));

    // その他: 5位以降の子カテゴリ＋子なし親を全部フラットに
    const otherTags: any[] = [];
    for (const p of parents.slice(TOP_N)) {
      const kids = childMap[p.id] ?? [];
      if (kids.length > 0) {
        otherTags.push(...kids.map((c: any) => ({ id: c.id, name: c.name, count: c.count })));
      } else {
        otherTags.push({ id: p.id, name: p.name, count: p.count });
      }
    }
    otherTags.sort((a, b) => b.count - a.count);

    const sections = [
      ...topSections,
      { id: 0, name: 'その他', count: 0, children: otherTags },
    ];

    return NextResponse.json({ sections }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (e) {
    console.error('[/api/gacha/wp-categories]', e);
    return NextResponse.json({ sections: [] }, { status: 500 });
  }
}
