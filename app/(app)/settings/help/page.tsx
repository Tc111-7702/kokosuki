import { StaticTextPage } from '@/components/StaticTextPage';

export default function HelpPage() {
  return (
    <StaticTextPage title="ヘルプ・お知らせ">
      <h2 className="text-[15px] font-black mb-2" style={{ color: '#111' }}>mikkeの使い方</h2>
      <p className="mb-4">
        mikkeは、気になるガチャが「どこにあるか」をみんなで見つけるアプリです。
        マップでガチャスポットを探して、お店に着いたら在庫を報告したり、引いた結果を投稿してみましょう。
        あなたの報告が、誰かの「あった！」につながります。
      </p>
      <h2 className="text-[15px] font-black mb-2" style={{ color: '#111' }}>お問い合わせ</h2>
      <p className="mb-4">
        不具合のご報告・ご意見は、運営までお気軽にご連絡ください。
        いただいた声はサービスの改善に活用させていただきます。
      </p>
      <h2 className="text-[15px] font-black mb-2" style={{ color: '#111' }}>お知らせ</h2>
      <p>現在お知らせはありません。</p>
    </StaticTextPage>
  );
}
