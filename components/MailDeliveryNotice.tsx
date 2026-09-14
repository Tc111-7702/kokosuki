interface Props {
  children: React.ReactNode;
  color?: string;
  className?: string;
  /** true のときモバイルでもブロック・文言とも中央揃え */
  centerOnMobile?: boolean;
}

/** メール送信完了メッセージ（モバイル: ブロック中央・文言左揃え / デスクトップ: 中央揃え） */
export function MailDeliveryNotice({
  children,
  color = '#2E7D32',
  className = '',
  centerOnMobile = false,
}: Props) {
  return (
    <div
      className={`w-full min-w-0 max-w-full flex flex-col ${
        centerOnMobile ? 'items-center' : 'items-stretch md:items-center'
      } ${className}`}
    >
      <p
        className={`mail-delivery-notice-text text-[12px] md:text-[14px] font-bold leading-relaxed w-full min-w-0 md:max-w-[520px] ${
          centerOnMobile ? 'text-center' : 'text-left md:text-center'
        }`}
        style={{ color }}
      >
        {children}
      </p>
    </div>
  );
}
