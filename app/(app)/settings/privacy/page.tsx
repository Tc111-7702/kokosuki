import { StaticTextPage } from '@/components/StaticTextPage';

export default function PrivacyPage() {
  return (
    <StaticTextPage title="プライバシーポリシー">
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
    </StaticTextPage>
  );
}
