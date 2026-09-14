import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { loginDisplayFont } from '@/lib/loginFonts';

interface Props {
  title: string;
  selectedCount: number;
  /** ip: デスクトップでサブタイトルと件数を横並び / gacha: Figma 通り縦並び＋件数左揃え */
  layout?: 'ip' | 'gacha';
  /** gacha: 「0件選択中」と同じ行の右側（例: ほかのIPを見る） */
  countRowRight?: ReactNode;
  /** デスクトップ: タイトル左に戻るボタン */
  onDesktopBack?: () => void;
}

/** 新規登録: IP選択・ガチャ選択の共通ヘッダー */
export function SignupFavoriteStepHeader({
  title,
  selectedCount,
  layout = 'gacha',
  countRowRight,
  onDesktopBack,
}: Props) {
  const isGachaLayout = layout === 'gacha';

  return (
    <div className={`w-full shrink-0 ${loginDisplayFont.className}`}>
      <div className="max-md:translate-y-2">
        <div className="relative mt-1 md:mt-2 w-full">
          {onDesktopBack ? (
            <button
              type="button"
              onClick={onDesktopBack}
              className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -ml-1 p-1 active:opacity-60 disabled:opacity-50 z-10"
              aria-label="戻る"
            >
              <ChevronLeft size={28} strokeWidth={2} color="#111111" />
            </button>
          ) : null}
          <h1
            className={`font-black text-center leading-snug w-full ${
              isGachaLayout ? 'text-[17px] md:text-[21px]' : 'text-[20px] md:text-[22px]'
            }`}
            style={{ color: '#111111' }}
          >
            {title}
          </h1>
        </div>

        {isGachaLayout ? (
          <>
            <p
              className="mt-1 md:mt-2 text-[12px] md:text-[15px] font-bold text-center w-full"
              style={{ color: '#64748b' }}
            >
              いつでも追加できます
            </p>
            <div
              className={`mt-3 md:mt-4 grid gap-3 md:gap-4 items-center w-full ${
                countRowRight ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-4'
              }`}
            >
              <p
                className="text-[12px] md:text-[15px] font-bold text-left md:col-start-1"
                style={{ color: '#111111' }}
              >
                {selectedCount}件選択中
              </p>
              {countRowRight ? (
                <div className="flex justify-center min-w-0 md:col-start-4">{countRowRight}</div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mt-1 md:mt-2 flex flex-col md:flex-row md:items-center md:justify-center md:gap-3 w-full">
            <p
              className="text-[12px] md:text-[13px] font-bold text-center md:text-left"
              style={{ color: '#64748b' }}
            >
              いつでも追加できます
            </p>
            <p
              className="mt-2 md:mt-0 text-[12px] md:text-[13px] font-bold text-left w-full md:w-auto"
              style={{ color: '#111111' }}
            >
              {selectedCount}件選択中
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
