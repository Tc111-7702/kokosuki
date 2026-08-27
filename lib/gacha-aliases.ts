/**
 * ガチャ検索エイリアス
 * カタカナ入力 → DB内の正式名称（部分）にマッピング
 * キーは検索キーワード（複数可）、値はDBで検索するキーワード
 */
export const GACHA_ALIASES: Record<string, string> = {
  // ハンターハンター
  'ハンターハンター':    'HUNTER',
  'ハンター×ハンター':   'HUNTER',
  'ハンターｘハンター':  'HUNTER',
  // ワンピース
  'ワンピース':          'ONE PIECE',
  'ワンピ':              'ONE PIECE',
  // ドラゴンボール
  'ドラゴンボール':      'DRAGON BALL',
  'ドラゴンボールz':     'DRAGON BALL',
  'ドラゴンボールZ':     'DRAGON BALL',
  // ナルト
  'ナルト':              'NARUTO',
  'ナルトー':            'NARUTO',
  // 鬼滅の刃
  '鬼滅':                '鬼滅の刃',
  'きめつのやいば':      '鬼滅の刃',
  // 呪術廻戦
  '呪術':                '呪術廻戦',
  // 進撃の巨人
  '進撃':                '進撃の巨人',
  // ブリーチ
  'ブリーチ':            'BLEACH',
  // ジョジョ
  'ジョジョ':            'ジョジョの奇妙な冒険',
  // フェアリーテイル
  'フェアリーテイル':    'FAIRY TAIL',
  'フェアリーテール':    'FAIRY TAIL',
  // マッシュル
  'マッシュル':          'MASHLE',
  // ブルーロック
  'ブルーロック':        'BLUE LOCK',
  // 東京リベンジャーズ
  '東リベ':              '東京リベンジャーズ',
  // チェンソーマン
  'チェンソーマン':      'チェンソーマン',
  'チェンソー':          'チェンソーマン',
  // デスノート
  'death note':          'DEATH NOTE',
  'deathnote':           'DEATH NOTE',
  'デスノート':          'DEATH NOTE',
  'デスノ':              'DEATH NOTE',
};

/**
 * ひらがな→カタカナ変換＋全角/半角ゆれの正規化（NFKC）。
 * DB内のIP/シリーズ名はカタカナ主体で、contains検索の mode:'insensitive' は英字大小しか
 * 吸収しないため、かな入力（例「ぽけ」）をカタカナ形（「ポケ」）に正規化して検索語に足す。
 */
export function toKatakana(s: string): string {
  return s
    .normalize('NFKC')                                   // 半角カナ・全角英数などのゆれを吸収
    .replace(/[ぁ-ゖ]/g, (c) =>                   // ひらがな → カタカナ
      String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/** cands のいずれかが述語に一致する最初のエイリアス値を返す */
function findAlias(cands: string[], pred: (key: string, cand: string) => boolean): string | null {
  for (const cand of cands) {
    for (const [key, val] of Object.entries(GACHA_ALIASES)) {
      if (pred(key.toLowerCase(), cand)) return val;
    }
  }
  return null;
}

/**
 * 入力クエリをエイリアス展開＋かな正規化した検索ワードリストを返す（元のクエリも含む・重複排除）。
 * 元入力とカタカナ正規化形の両方でエイリアス照合し、両方を検索語に含めることで
 * ひらがな入力でもカタカナのDB名・エイリアスに当たるようにする。
 */
export function expandQuery(q: string): string[] {
  const terms = new Set<string>([q]);
  const kata = toKatakana(q);
  if (kata !== q) terms.add(kata);

  // 照合候補（元入力＋カタカナ正規化形の小文字）
  const cands = [...new Set([q.toLowerCase(), kata.toLowerCase()])];

  // エイリアス（完全一致優先 → 部分一致）。
  // ※ 部分一致は key.includes(cand)（キーが入力を含む）のみ。cand.includes(key) は
  //   フル系列名に短いエイリアスが含まれ全シリーズ一致してしまうため使わない。
  const alias =
    findAlias(cands, (key, cand) => key === cand) ??
    findAlias(cands, (key, cand) => key.includes(cand));
  if (alias) terms.add(alias);

  return [...terms];
}
