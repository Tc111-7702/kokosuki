// メールアドレス入力に全角文字が含まれるかの判定（IME による全角入力ミスを検出する）。
// 全角ASCII(ＡＢＣ０１２＠．等)・全角記号・全角スペース・ひらがな・カタカナ・漢字を対象にする。
const FULLWIDTH_RE = /[！-｠￠-￦　぀-ヿ㐀-鿿]/;

export function containsFullWidth(value: string): boolean {
  return FULLWIDTH_RE.test(value);
}

export const FULLWIDTH_EMAIL_ERROR = 'メールアドレスは半角で入力してください';
