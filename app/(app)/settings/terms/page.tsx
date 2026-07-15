import { StaticTextPage } from '@/components/StaticTextPage';

export default function TermsPage() {
  return (
    <StaticTextPage title="利用規約">
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
    </StaticTextPage>
  );
}
