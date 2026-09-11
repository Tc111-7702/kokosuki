'use client';

import Link from 'next/link';

// 設定内の静的テキスト（ヘルプ・利用規約・プライバシーポリシー）
// SettingsSheet の body に差し込んで使う

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-6">
      <div className="text-[13px] leading-relaxed" style={{ color: '#555' }}>{children}</div>
    </div>
  );
}

export function HelpContent() {
  return (
    <Body>
      <h2 className="text-[15px] font-black mb-2" style={{ color: '#111' }}>mikkeの使い方</h2>
      <p className="mb-4">
        mikkeは、気になるガチャが「どこにあるか」をみんなで見つけるアプリです。
        マップでガチャスポットを探して、お店に着いたら在庫を報告したり、引いた結果を投稿してみましょう。
        あなたの報告が、誰かの「あった！」につながります。
      </p>
      <h2 className="text-[15px] font-black mb-2" style={{ color: '#111' }}>お問い合わせ</h2>
      <p className="mb-1">
        不具合のご報告・ご意見は、運営までお気軽にご連絡ください。いただいた声はサービスの改善に活用させていただきます。
      </p>
      <Link
        href="/settings/inquiry"
        className="inline-block mb-4 text-[13px] font-bold text-[#B45309] underline underline-offset-2 hover:opacity-80 active:opacity-60"
      >
        お問い合わせフォームはこちら
      </Link>
      <h2 className="text-[15px] font-black mb-2" style={{ color: '#111' }}>お知らせ</h2>
      <p>現在お知らせはありません。</p>
    </Body>
  );
}

export function PrivacyContent() {
  return (
    <Body>
      <p className="mb-4">
        mikke（以下「本サービス」）は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
      </p>
      <h2 className="text-[14px] font-black mb-2" style={{ color: '#111' }}>取得する情報</h2>
      <p className="mb-4">
        メールアドレス、プロフィール情報（名前・アイコン等）、位置情報（許可した場合のみ・在庫報告やスポット検索に利用）、投稿内容を取得します。
      </p>
      <h2 className="text-[14px] font-black mb-2" style={{ color: '#111' }}>利用目的</h2>
      <p className="mb-4">
        本サービスの提供・改善、在庫情報の集計・表示、不正利用の防止のために利用します。
        位置情報の履歴を第三者に個人が特定できる形で提供することはありません。
      </p>
      <h2 className="text-[14px] font-black mb-2" style={{ color: '#111' }}>お問い合わせ</h2>
      <p className="mb-4">個人情報の取扱いに関するお問い合わせは、運営までご連絡ください。</p>
      <p className="text-[11px]" style={{ color: '#AAA' }}>※正式なポリシー文はリリースまでに整備予定です。</p>
    </Body>
  );
}

export function TermsContent() {
  return (
    <Body>
      <p className="mb-4">
        この利用規約（以下「本規約」）は、mikke（以下「本サービス」）の利用条件を定めるものです。
        ユーザーの皆さまには、本規約に同意のうえ本サービスをご利用いただきます。
      </p>
      <h2 className="text-[14px] font-black mb-2" style={{ color: '#111' }}>第1条（適用）</h2>
      <p className="mb-4">本規約は、ユーザーと運営との間の本サービスの利用に関わる一切の関係に適用されます。</p>
      <h2 className="text-[14px] font-black mb-2" style={{ color: '#111' }}>第2条（禁止事項）</h2>
      <p className="mb-4">
        虚偽の在庫報告、他のユーザーや店舗への迷惑行為、法令または公序良俗に違反する行為を禁止します。
        店舗の掲載情報について削除のご要望がある場合は、運営までご連絡ください。速やかに対応いたします。
      </p>
      <h2 className="text-[14px] font-black mb-2" style={{ color: '#111' }}>第3条（本規約の変更）</h2>
      <p className="mb-4">運営は、必要と判断した場合には、ユーザーに通知のうえ本規約を変更できるものとします。</p>
      <p className="text-[11px]" style={{ color: '#AAA' }}>※正式な規約文はリリースまでに整備予定です。</p>
    </Body>
  );
}
