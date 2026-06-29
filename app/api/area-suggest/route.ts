import { NextResponse } from 'next/server';
import municipalities from '@/lib/map/japan-municipalities.json';

const data = municipalities as Record<string, string[]>;

// GET /api/area-suggest?q=奈良
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ suggestions: [] });

  const results: { label: string; sublabel?: string }[] = [];

  for (const [pref, cities] of Object.entries(data)) {
    const prefExact = pref === q;
    const prefPartial = !prefExact && pref.includes(q);

    // 都道府県名と完全一致 → その都道府県の全市区町村を列挙
    if (prefExact) {
      for (const city of cities) {
        results.push({ label: `${pref}${city}`, sublabel: pref });
      }
      return NextResponse.json({ suggestions: results });
    }

    // 都道府県名に部分一致 → 都道府県自体＋先頭5市区町村
    if (prefPartial) {
      results.push({ label: pref });
      for (const city of cities.slice(0, 5)) {
        results.push({ label: `${pref}${city}`, sublabel: pref });
      }
      continue;
    }

    // 市区町村名に部分一致
    for (const city of cities) {
      if (city.includes(q)) {
        results.push({ label: `${pref}${city}`, sublabel: pref });
      }
    }
  }

  return NextResponse.json({ suggestions: results.slice(0, 100) });
}
