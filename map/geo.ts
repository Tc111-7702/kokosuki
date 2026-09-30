import type { SpotDetail } from '@/components/SpotDetailSheet';

// ─── 都道府県庁所在地 ────────────────────────────────────────────────────────

export const PREF_CAPITALS: Record<string, string> = {
  '北海道':'札幌市','青森県':'青森市','岩手県':'盛岡市','宮城県':'仙台市','秋田県':'秋田市',
  '山形県':'山形市','福島県':'福島市','茨城県':'水戸市','栃木県':'宇都宮市','群馬県':'前橋市',
  '埼玉県':'さいたま市','千葉県':'千葉市','東京都':'新宿区','神奈川県':'横浜市','新潟県':'新潟市',
  '富山県':'富山市','石川県':'金沢市','福井県':'福井市','山梨県':'甲府市','長野県':'長野市',
  '岐阜県':'岐阜市','静岡県':'静岡市','愛知県':'名古屋市','三重県':'津市','滋賀県':'大津市',
  '京都府':'京都市','大阪府':'大阪市','兵庫県':'神戸市','奈良県':'奈良市','和歌山県':'和歌山市',
  '鳥取県':'鳥取市','島根県':'松江市','岡山県':'岡山市','広島県':'広島市','山口県':'山口市',
  '徳島県':'徳島市','香川県':'高松市','愛媛県':'松山市','高知県':'高知市','福岡県':'福岡市',
  '佐賀県':'佐賀市','長崎県':'長崎市','熊本県':'熊本市','大分県':'大分市','宮崎県':'宮崎市',
  '鹿児島県':'鹿児島市','沖縄県':'那覇市',
};

// ─── 逆ジオコーディング ──────────────────────────────────────────────────────

/**
 * 緯度経度から「都道府県 市区町村」形式の住所文字列を返す。
 * 取得できない場合は null。
 */
export async function reverseGeocode(lat: number, lng: number, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${token}&language=ja&limit=1&types=address,place,locality`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const ctx      = feature.context ?? [];
    const locality = ctx.find((c: { id: string; text: string }) => c.id.startsWith('locality'));
    const place    = ctx.find((c: { id: string; text: string }) => c.id.startsWith('place'));
    const region   = ctx.find((c: { id: string; text: string }) => c.id.startsWith('region'));
    const cityPart = [place?.text, locality?.text].filter(Boolean).join('');
    if (cityPart && region) return `${region.text} ${cityPart}`;
    if (cityPart) return cityPart;
    return feature.place_name?.split(',').slice(0, 2).join('') ?? null;
  } catch {
    return null;
  }
}

// ─── 検索クエリの位置情報解決 ────────────────────────────────────────────────

export interface ResolvedLocation {
  resolvedSpot: SpotDetail | null;
  resolvedPos: { lat: number; lng: number } | null;
  resolvedGeoAddress: string;
  searchLocationType: 'station' | 'city' | 'prefecture' | 'address' | null;
  addressFilterText: string | null;
}

/**
 * locationQuery を店舗名・駅名・住所・都道府県などに解釈して座標を解決する。
 * client の state/ref には触れず、純粋に非同期で解決結果を返す。
 */
export async function resolveLocation(
  locationQuery: string,
  coords: { lat: number; lng: number } | undefined,
  currentPos: { lat: number; lng: number } | null,
  token: string,
): Promise<ResolvedLocation> {
  let resolvedSpot: SpotDetail | null = null;
  let resolvedPos: { lat: number; lng: number } | null = null;
  let resolvedGeoAddress: string = locationQuery;
  let searchLocationType: 'station' | 'city' | 'prefecture' | 'address' | null = null;
  let addressFilterText: string | null = null;

  if (locationQuery.trim()) {
    const lat = currentPos?.lat ?? 0;
    const lng = currentPos?.lng ?? 0;
    const res  = await fetch(`/api/spots/search?name=${encodeURIComponent(locationQuery)}&lat=${lat}&lng=${lng}`);
    const data = await res.json();

    if (data.spot) {
      resolvedSpot = data.spot as SpotDetail;
    } else if (coords) {
      resolvedPos = coords;
      searchLocationType = 'station';
      const addr = await reverseGeocode(coords.lat, coords.lng, token);
      if (addr) resolvedGeoAddress = addr;
    } else {
      if (/駅/.test(locationQuery.trim())) {
        try {
          const stRes = await fetch(`/api/station-suggest?q=${encodeURIComponent(locationQuery.trim())}`);
          const stData = await stRes.json();
          const first = stData.suggestions?.[0];
          if (first) {
            resolvedPos = { lat: first.lat, lng: first.lng };
            searchLocationType = 'station';
            const addr = await reverseGeocode(first.lat, first.lng, token);
            resolvedGeoAddress = addr ? `${first.label}（${addr}）` : first.label;
          }
        } catch {}
      }
      if (!resolvedPos) {
        try {
          const geoRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json` +
            `?access_token=${token}&country=JP&language=ja&limit=1`
          );
          const geoData = await geoRes.json();
          if (geoData.features?.[0]) {
            const feat = geoData.features[0];
            const [glng, glat] = feat.center;
            resolvedPos = { lat: glat, lng: glng };
            const ctx = feat.context ?? [];
            const lc = ctx.find((c: { id: string; text: string }) => c.id.startsWith('locality'));
            const pl = ctx.find((c: { id: string; text: string }) => c.id.startsWith('place'));
            const rg = ctx.find((c: { id: string; text: string }) => c.id.startsWith('region'));
            const featIsPlace  = (feat.place_type as string[])?.some((t: string) => t === 'place' || t === 'locality' || t === 'district');
            const featIsRegion = (feat.place_type as string[])?.some((t: string) => t === 'region');
            if (featIsPlace && rg) {
              const isFeatCity = (feat.place_type as string[]).includes('place');
              const prefixCity = !isFeatCity && pl ? pl.text : '';
              const displayCity = `${prefixCity}${feat.text}`;
              resolvedGeoAddress = `${rg.text} ${displayCity}`;
              searchLocationType = 'city';
              addressFilterText = displayCity;
            } else if (featIsRegion) {
              const capital = PREF_CAPITALS[feat.text as string];
              resolvedGeoAddress = capital ? `${feat.text} ${capital}` : feat.text;
              searchLocationType = 'prefecture';
              addressFilterText = feat.text;
            } else if (rg) {
              const cityPart = [pl?.text, lc?.text].filter(Boolean).join('');
              if (cityPart) {
                resolvedGeoAddress = `${rg.text} ${cityPart}`;
                searchLocationType = 'city';
                addressFilterText = cityPart;
              } else {
                const capital = PREF_CAPITALS[rg.text as string];
                resolvedGeoAddress = capital ? `${rg.text} ${capital}` : rg.text;
                searchLocationType = 'prefecture';
                addressFilterText = rg.text;
              }
            } else {
              resolvedGeoAddress = feat.place_name?.split(',')[0] ?? locationQuery;
              searchLocationType = 'address';
            }
          }
        } catch {}
      }
    }
  }

  return { resolvedSpot, resolvedPos, resolvedGeoAddress, searchLocationType, addressFilterText };
}

// ─── コンテンツ解決 ──────────────────────────────────────────────────────────

export interface ContentResult {
  type: string;
  gachaIds: string[];
  label: string;
}

/** contentQuery をガチャ検索APIで解決して返す。ヒットなしは null。 */
export async function resolveContent(contentQuery: string): Promise<ContentResult | null> {
  if (!contentQuery.trim()) return null;
  const res  = await fetch(`/api/gacha/search?q=${encodeURIComponent(contentQuery)}`);
  const data = await res.json();
  return data.type ? (data as ContentResult) : null;
}
