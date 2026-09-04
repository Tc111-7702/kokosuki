import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// #19 Phase④: signup の IP 選択を WP カテゴリ直取得から
// 正規化済みの IpCategory / IpName テーブル参照に切り替える。
// - セクション = IpCategory（固定5カテゴリ, sortOrder 順）
// - タグ       = そのカテゴリに属す IpName（配下ガチャ数付き・人気順）
//   ※ ジャンル名（トップ親カテゴリ名）は syncIpNameTable で除外済みなので出ない。

interface CategorySummary {
  id: string;
  name: string;
  count: number;
}

export async function GET() {
  try {
    const categories = await db.getIpCategoriesWithIpNames();

    const sections = categories
      .map((cat) => {
        const children: CategorySummary[] = cat.ipNames
          .map((ip) => ({ id: ip.id, name: ip.name, count: ip._count.gachas }))
          .filter((c) => c.count > 0)               // ガチャ0件のIPは出さない
          .sort((a, b) => b.count - a.count);       // 人気順
        const count = children.reduce((s, c) => s + c.count, 0);
        return { id: cat.key, name: cat.name, count, children };
      })
      .filter((sec) => sec.children.length > 0);     // 空カテゴリは出さない

    return NextResponse.json({ sections }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (e) {
    console.error('[/api/gacha/wp-categories]', e);
    return NextResponse.json({ sections: [] }, { status: 500 });
  }
}
