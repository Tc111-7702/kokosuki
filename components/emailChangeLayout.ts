/** メール変更フロー共通レイアウト（モバイル: ブロック中央・文言左揃え / デスクトップ: 中央） */
export const EMAIL_NOTICE_COLOR = '#2E7D32';

export const emailPanelClass =
  'flex flex-col items-center gap-4 md:gap-6 w-full text-left md:text-center';

/** デスクトップで入力欄だけやや狭く */
export const emailFormGroupClass =
  'flex flex-col gap-1.5 md:gap-2 w-full md:max-w-[400px] items-stretch md:items-center';

export const emailFieldClass =
  'bg-white rounded-xl px-3 md:px-4 text-[14px] md:text-[16px] outline-none w-full text-left';

export const emailFieldStyle = { border: '1.5px solid #EDE9D8', color: '#111' } as const;

export const emailLabelClass =
  'text-[12px] md:text-[14px] font-bold text-left md:text-center w-full';

export const emailBodyClass =
  'text-[13px] md:text-[16px] leading-relaxed md:whitespace-nowrap text-left md:text-center w-full';

export const emailNoticeClass =
  'text-[12px] md:text-[14px] font-bold leading-relaxed text-left line-clamp-3 w-full';

/** バリデーション・エラーメッセージ（常に中央揃え） */
export const emailErrorClass =
  'text-[12px] md:text-[14px] font-bold leading-relaxed text-center w-full';

export const emailButtonClass =
  'px-5 md:px-7 py-2.5 md:py-3 rounded-xl text-[13px] md:text-[15px] font-bold active:opacity-70 disabled:opacity-50 md:whitespace-nowrap self-center';

/** メールアドレス登録用の送信ボタン（長い文言のため左右paddingを狭く） */
export const emailSendButtonClass =
  'px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-[12px] md:text-[14px] font-bold active:opacity-70 disabled:opacity-50 md:whitespace-nowrap self-center';

export const emailPrimaryButtonStyle = (enabled: boolean) => ({
  background: enabled ? '#F2B800' : '#E5E1D0',
  color: enabled ? '#111' : '#AAA',
});
