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
  'ジョジョ':            'ジョジョ',
  // 転スラ
  '転スラ':              '転生したらスライム',
  'てんすら':            '転生したらスライム',
  // リゼロ
  'リゼロ':              'Re:ゼロ',
  'りぜろ':              'Re:ゼロ',
  // デモンスレイヤー
  'デモンスレイヤー':    '鬼滅の刃',
  // ポケモン
  'ポケモン':            'ポケット',
  'ポケットモンスター':  'ポケット',
  // 僕のヒーローアカデミア
  'ヒロアカ':            'ヒーローアカデミア',
  'ぼくのひーろーあかでみあ': 'ヒーローアカデミア',
  // ブラッククローバー
  'ブラクロ':            'ブラッククローバー',
  // アバター
  'アバター':            'アバター',
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
};

/** 入力クエリをエイリアス展開した検索ワードリストを返す（元のクエリも含む） */
export function expandQuery(q: string): string[] {
  const lower = q.toLowerCase();
  // 完全一致を先にチェック
  for (const [key, val] of Object.entries(GACHA_ALIASES)) {
    if (key.toLowerCase() === lower) {
      return [val, q]; // エイリアス値を優先、元のクエリも保持
    }
  }
  // 前方一致 or 部分一致
  for (const [key, val] of Object.entries(GACHA_ALIASES)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return [val, q];
    }
  }
  return [q];
}
