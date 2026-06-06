// 狙い撃ちマップ用：スポット × シリーズ（お気に入り）の在庫状態。
// 本番は machine の在庫報告から動的に算出するが、デモは明示データで「目当てレンズ」を安定再現する。

export type StockFresh = 'fresh' | 'aging' | 'none' | 'unreported';

// ── その店に紐づくQ&A（列・制限・今の様子など、OCに流れていた会話をMikkeに取り込む） ──
export interface QAAnswer { id: string; userName: string; text: string; createdAt: string }
export interface QAItem   { id: string; userName: string; text: string; createdAt: string; answers: QAAnswer[] }

const isoAgo = (min: number) => new Date(Date.now() - min * 60 * 1000).toISOString();

export const SPOT_QA_SEED: Record<string, QAItem[]> = {
  s1: [
    {
      id: 'q1', userName: 'みお', text: '今、列どれくらいですか？', createdAt: isoAgo(20),
      answers: [{ id: 'a1', userName: 'けんた', text: 'さっき3人くらい。回転早いのですぐでした', createdAt: isoAgo(12) }],
    },
    { id: 'q2', userName: 'ゆい', text: 'おひとり様、何回までとかありますか？', createdAt: isoAgo(50), answers: [] },
  ],
  s4: [
    {
      id: 'q3', userName: 'りく', text: 'ポケモンまだ残ってそうでした？', createdAt: isoAgo(25),
      answers: [{ id: 'a2', userName: 'なな', text: '15分前で残りわずか！急いだ方がいいかも', createdAt: isoAgo(14) }],
    },
  ],
};

export interface SpotStockEntry {
  gachaId: string;
  state: StockFresh;
  minutesAgo?: number; // 最終報告からの経過
  reportCount?: number; // 合意（裏付けた人数）
}

// 現在のお気に入り（g1 ポケモン vol.5 / g4 ワンピース）を各スポットにどう配置するか
export const SPOT_FAVORITE_STOCK: Record<string, SpotStockEntry[]> = {
  s1: [ // アキバガチャ広場（近い）：お気に入り2件 → facepile
    { gachaId: 'g1', state: 'fresh', minutesAgo: 30, reportCount: 2 },
    { gachaId: 'g4', state: 'aging', minutesAgo: 360, reportCount: 1 },
    { gachaId: 'g3', state: 'fresh', minutesAgo: 40, reportCount: 2 }, // 非お気に入り（検索で狙える）
  ],
  s4: [ // ガチャポンの殿堂 秋葉原（近い）
    { gachaId: 'g1', state: 'fresh', minutesAgo: 15, reportCount: 3 },
    { gachaId: 'g5', state: 'fresh', minutesAgo: 55, reportCount: 1 },
  ],
  s2: [ // ガチャの森 池袋
    { gachaId: 'g4', state: 'fresh', minutesAgo: 45, reportCount: 2 },
    { gachaId: 'g5', state: 'fresh', minutesAgo: 80, reportCount: 2 },
  ],
  s3: [ // カプコン渋谷：取扱あり・未報告 → 報告CTAの起点
    { gachaId: 'g1', state: 'unreported' },
    { gachaId: 'g3', state: 'unreported' },
  ],
  s5: [ // イトーヨーカドー錦糸町：在庫なし報告
    { gachaId: 'g4', state: 'none', minutesAgo: 120, reportCount: 1 },
    { gachaId: 'g5', state: 'none', minutesAgo: 90, reportCount: 1 },
  ],
  s6: [], // 該当なし（単一フォーカス時は薄く）
};

export const STOCK_STYLE: Record<StockFresh, { ring: string; label: string; dashed?: boolean }> = {
  fresh:      { ring: '#22C55E', label: '在庫あり' },
  aging:      { ring: '#F59E0B', label: '在庫あり・要確認' },
  none:       { ring: '#EF4444', label: '在庫なし' },
  unreported: { ring: '#9CA3AF', label: '未報告', dashed: true },
};

// 表示は「色に頼らずアイコンで」3カテゴリに集約。鮮度は緑の中の強弱（脈動＋時刻）で表す
export type StockCategory = 'available' | 'unknown' | 'none';

export const STOCK_DISPLAY: Record<StockFresh, {
  category: StockCategory; pip: string; icon: 'check' | 'q' | 'x'; label: string; pulse: boolean; faded: boolean;
}> = {
  fresh:      { category: 'available', pip: '#22C55E', icon: 'check', label: '在庫あり', pulse: true,  faded: false },
  aging:      { category: 'available', pip: '#22C55E', icon: 'check', label: '在庫あり', pulse: false, faded: false },
  none:       { category: 'none',      pip: '#EF4444', icon: 'x',     label: '在庫なし', pulse: false, faded: true  },
  unreported: { category: 'unknown',   pip: '#9CA3AF', icon: 'q',     label: '未報告',   pulse: false, faded: true  },
};

// 表示優先度：新鮮 > 要確認 > 未報告 > なし
export const STOCK_PRIORITY: Record<StockFresh, number> = {
  fresh: 3, aging: 2, unreported: 1, none: 0,
};

// スポットの、目当て条件に合う在庫エントリ（優先度順）
// target='all' → お気に入りのみ／target=gachaId → そのシリーズ（お気に入りでなくてもOK＝検索で狙い撃ち）
export function spotEntries(spotId: string, favIds: Set<string>, target: 'all' | string): SpotStockEntry[] {
  const all = SPOT_FAVORITE_STOCK[spotId] ?? [];
  return all
    .filter((e) => (target === 'all' ? favIds.has(e.gachaId) : e.gachaId === target))
    .sort((a, b) => STOCK_PRIORITY[b.state] - STOCK_PRIORITY[a.state]);
}

function mins(m?: number): string {
  if (m == null) return '';
  if (m < 60) return `${m}分前`;
  if (m < 1440) return `${Math.floor(m / 60)}時間前`;
  return `${Math.floor(m / 1440)}日前`;
}

// 期待値調整の核：状態の断定でなく「観測の報告」として、確度を言葉で段階化する
export function stockPhrase(e: SpotStockEntry): { lead: string; sub: string } {
  const people = e.reportCount ?? 1;
  if (e.state === 'unreported') return { lead: '未確認', sub: '在庫を報告してね' };
  if (e.state === 'none')       return { lead: '売り切れの報告', sub: `${mins(e.minutesAgo)}${people > 1 ? ` ・ ${people}人` : ''}` };
  // 在庫ありの報告：断定せず確度を言葉で
  const fresh = (e.minutesAgo ?? 9999) <= 120;
  if (fresh && people >= 2) return { lead: '今ありそう',     sub: `${mins(e.minutesAgo)} ・ ${people}人が確認` };
  if (fresh)                return { lead: '少し前にあった', sub: `${mins(e.minutesAgo)} ・ 要確認` };
  return { lead: '以前あった', sub: `${mins(e.minutesAgo)} ・ 要確認` };
}
