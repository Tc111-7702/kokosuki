// 終了日は信頼できるデータが取れないため ending_soon は廃止。
// 取れるのは「発売週（開始）」のみ → 発売前=coming_soon / 発売後=on_sale。
export type GachaStatus   = 'on_sale' | 'coming_soon';
export type GachaCategory = 'anime' | 'character' | 'other';
export type GachaKind     = 'gacha' | 'other';

export interface GachaItem {
  id: string;
  seriesName: string;
  ipName: string;
  kind: GachaKind;
  category: GachaCategory;
  gradientFrom: string;
  gradientTo: string;
  status: GachaStatus;
  startWeekLabel?: string;
  price: number;
  commentCount: number;
  weeklyPulls: number;
  isCollab?: boolean;
  isReissue?: boolean;
  isContinuation?: boolean;
  lineup?: string[]; // 全ラインナップ（全○種）。ほしい順ランキング入力に使う
}

export const GACHA_ITEMS: GachaItem[] = [
  /* ── 発売中・アニメ系 ── */
  {
    id: 'g1', seriesName: 'ポケモン ミニフィギュア vol.5', ipName: 'ポケモン',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#FFD84D', gradientTo: '#F59E0B',
    status: 'on_sale', price: 300, commentCount: 42, weeklyPulls: 127,
    isContinuation: true,
    lineup: ['ピカチュウ', 'リザードン', 'イーブイ', 'ミュウ', 'ゲンガー', 'カビゴン'],
  },
  {
    id: 'g2', seriesName: 'ハイキュー!! めじるしアクスタ 第4弾', ipName: 'ハイキュー!!',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#FB923C', gradientTo: '#DC2626',
    status: 'on_sale', price: 400, commentCount: 28, weeklyPulls: 84,
    isContinuation: true,
  },
  {
    id: 'g3', seriesName: '呪術廻戦 マスコットフィギュア 最強編', ipName: '呪術廻戦',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#7C3AED', gradientTo: '#1E1B4B',
    status: 'on_sale', price: 500, commentCount: 65, weeklyPulls: 201,
    lineup: ['五条悟', '宿儺', '虎杖悠仁', '伏黒恵', '釘崎野薔薇'],
  },
  {
    id: 'g4', seriesName: 'ワンピース ガチャ 麦わらver.', ipName: 'ワンピース',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#2563EB', gradientTo: '#0C4A6E',
    status: 'on_sale', price: 300, commentCount: 33, weeklyPulls: 156,
    lineup: ['ルフィ', 'ゾロ', 'ナミ', 'サンジ', 'チョッパー'],
  },
  {
    id: 'g5', seriesName: 'チェンソーマン マスコット vol.2', ipName: 'チェンソーマン',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#475569', gradientTo: '#111827',
    status: 'on_sale', price: 500, commentCount: 19, weeklyPulls: 67,
    isContinuation: true,
  },
  /* ── 発売中（人気・話題） ── */
  {
    id: 'g6', seriesName: 'ポケモン ミニフィギュア 第4弾', ipName: 'ポケモン',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#FDE047', gradientTo: '#EAB308',
    status: 'on_sale', price: 300, commentCount: 88, weeklyPulls: 243,
    lineup: ['リザードン', 'ピカチュウ', 'フシギダネ', 'ゼニガメ', 'ミュウツー', 'ルカリオ'],
  },
  {
    id: 'g7', seriesName: 'ハイキュー!! アクリルスタンド 合宿編', ipName: 'ハイキュー!!',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#F97316', gradientTo: '#9A3412',
    status: 'on_sale', price: 500, commentCount: 51, weeklyPulls: 178,
  },
  {
    id: 'g8', seriesName: 'ジョジョ スタンドフィギュア 黄金の風', ipName: 'ジョジョ',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#A855F7', gradientTo: '#4C1D95',
    status: 'on_sale', price: 500, commentCount: 44, weeklyPulls: 119,
  },
  /* ── 来週から ── */
  {
    id: 'g9', seriesName: 'ちいかわ もこもこマスコット', ipName: 'ちいかわ',
    kind: 'gacha', category: 'character',
    gradientFrom: '#FCA5A5', gradientTo: '#F9A8D4',
    status: 'coming_soon', startWeekLabel: '6月第1週スタート', price: 400, commentCount: 34, weeklyPulls: 0,
    lineup: ['ちいかわ', 'ハチワレ', 'うさぎ', 'モモンガ'],
  },
  {
    id: 'g10', seriesName: 'HUNTER×HUNTER キャラフィギュア G.I.編', ipName: 'HUNTER×HUNTER',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#34D399', gradientTo: '#059669',
    status: 'coming_soon', startWeekLabel: '6月第2週スタート', price: 500, commentCount: 18, weeklyPulls: 0,
    lineup: ['ゴン', 'キルア', 'クラピカ', 'レオリオ', 'ヒソカ'],
  },
  {
    id: 'g11', seriesName: 'スパイファミリー アーニャストラップ', ipName: 'SPY×FAMILY',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#60A5FA', gradientTo: '#A78BFA',
    status: 'coming_soon', startWeekLabel: '6月第1週スタート', price: 300, commentCount: 15, weeklyPulls: 0,
  },
  /* ── コラボ・限定 ── */
  {
    id: 'g12', seriesName: 'サンリオ × LE SSERAFIM キャラチャーム', ipName: 'サンリオ',
    kind: 'gacha', category: 'character',
    gradientFrom: '#F9A8D4', gradientTo: '#C084FC',
    status: 'on_sale', price: 400, commentCount: 57, weeklyPulls: 148,
    isCollab: true,
  },
  {
    id: 'g13', seriesName: 'ポケモン × 原宿 POP-UP 限定ガチャ', ipName: 'ポケモン',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#F87171', gradientTo: '#EC4899',
    status: 'on_sale', price: 500, commentCount: 31, weeklyPulls: 95,
    isCollab: true,
  },
  /* ── 再販・復刻 ── */
  {
    id: 'g14', seriesName: 'ちいかわ めじるしアクセサリー（再販）', ipName: 'ちいかわ',
    kind: 'gacha', category: 'character',
    gradientFrom: '#FDE68A', gradientTo: '#FCA5A5',
    status: 'on_sale', price: 300, commentCount: 39, weeklyPulls: 113,
    isReissue: true,
  },
  {
    id: 'g15', seriesName: 'ポケモン 30周年 メタルチャーム（再販）', ipName: 'ポケモン',
    kind: 'gacha', category: 'anime',
    gradientFrom: '#FCD34D', gradientTo: '#D97706',
    status: 'on_sale', price: 300, commentCount: 22, weeklyPulls: 98,
    isReissue: true,
  },
  /* ── キャラクター系 ── */
  {
    id: 'g16', seriesName: 'サンリオキャラクターズ クリスタルめじるし', ipName: 'サンリオ',
    kind: 'gacha', category: 'character',
    gradientFrom: '#C084FC', gradientTo: '#818CF8',
    status: 'on_sale', price: 300, commentCount: 24, weeklyPulls: 76,
  },
  {
    id: 'g17', seriesName: 'ミッフィー ギンガムチェックコレクション', ipName: 'ミッフィー',
    kind: 'gacha', category: 'character',
    gradientFrom: '#BAE6FD', gradientTo: '#93C5FD',
    status: 'on_sale', price: 400, commentCount: 18, weeklyPulls: 62,
  },
  /* ── 動物・食べ物・その他 ── */
  {
    id: 'g18', seriesName: '本物そっくり！スイーツミニチュアガチャ', ipName: 'スイーツ',
    kind: 'gacha', category: 'other',
    gradientFrom: '#FDBA74', gradientTo: '#F472B6',
    status: 'on_sale', price: 300, commentCount: 15, weeklyPulls: 45,
  },
  {
    id: 'g19', seriesName: 'もふもふ犬マスコット vol.3', ipName: '犬',
    kind: 'gacha', category: 'other',
    gradientFrom: '#D4A27A', gradientTo: '#92400E',
    status: 'on_sale', price: 300, commentCount: 11, weeklyPulls: 38,
    isContinuation: true,
  },
];

/* ── 発売前の「楽しみの声」（coming_soon専用・読み取り専用シード） ──
   発売中は引いた！報告（みんなの投稿）が議論の場になるためコメントは持たない。
   発売前だけは投稿が存在しえないので、期待を可視化する軽量シードを置く。
   ユーザーの動線は「楽しみ！」リアクション（1タップ・自由入力なし＝モデレーション不要） */
export interface AnticipationVoice {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

export const ANTICIPATION_VOICES: Record<string, AnticipationVoice[]> = {
  g9: [
    { id: 'c_g9_1', userName: 'みお',   text: 'これは絶対コンプリートする…！もこもこ可愛すぎる', createdAt: '2026-06-01T08:10:00Z' },
    { id: 'c_g9_2', userName: 'さき',   text: 'ちいかわのガチャ毎回売り切れ早いから初日行く', createdAt: '2026-06-01T06:40:00Z' },
    { id: 'c_g9_3', userName: 'ゆい',   text: 'ハチワレ狙い！発売待ちきれない', createdAt: '2026-05-31T22:15:00Z' },
  ],
  g10: [
    { id: 'c_g10_1', userName: 'りく',  text: 'G.I.編きたあああ ゴンとキルアは絶対欲しい', createdAt: '2026-06-01T09:05:00Z' },
    { id: 'c_g10_2', userName: 'たく',  text: 'クラピカ狙いで回す予定', createdAt: '2026-05-31T20:30:00Z' },
  ],
  g11: [
    { id: 'c_g11_1', userName: 'あや',  text: 'アーニャのストラップ可愛い〜全種そろえたい', createdAt: '2026-06-01T07:20:00Z' },
    { id: 'c_g11_2', userName: 'のん',  text: 'これ通学バッグに付けたい', createdAt: '2026-05-31T23:50:00Z' },
  ],
};

export function getAnticipationVoices(itemId: string): AnticipationVoice[] {
  return ANTICIPATION_VOICES[itemId] ?? [];
}

// 投稿写真などのプレースホルダー用：IP名からブランドグラデを引く（picsumのランダム画像の代替）
export function ipGradient(ipName: string): { from: string; to: string } {
  const g = GACHA_ITEMS.find((x) => x.ipName === ipName);
  if (g) return { from: g.gradientFrom, to: g.gradientTo };
  // フォールバック：名前ハッシュで安定したグラデ
  let h = 0; for (let i = 0; i < ipName.length; i++) h = ipName.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return { from: `hsl(${hue} 70% 60%)`, to: `hsl(${(hue + 40) % 360} 65% 45%)` };
}

export function getStatusLabel(item: GachaItem): string {
  if (item.status === 'coming_soon') return item.startWeekLabel ?? 'もうすぐ発売';
  return '発売中';
}

export function getStatusStyle(status: GachaStatus): { bg: string; text: string } {
  const map: Record<GachaStatus, { bg: string; text: string }> = {
    on_sale:     { bg: '#F0FDF4', text: '#15803D' },
    coming_soon: { bg: '#EFF6FF', text: '#1D4ED8' },
  };
  return map[status];
}
