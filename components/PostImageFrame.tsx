'use client';

/** 投稿一覧（PostCard）の画像枠。
 *  1:1 を基準に、横長〜正方形は横幅をデバイス幅に合わせて高さ自動、
 *  1:1 より縦長の写真は高さを基準値で固定して比率を保ったまま横幅を縮める（中央寄せ）。 */
export const POST_IMAGE_FRAME_CLASS = 'flex w-full justify-center';

/** 縦長写真の高さ上限（1:1 基準の目安。縦長が大きくなりすぎるのを防ぐ・調整可）。 */
export const POST_IMAGE_MAX_HEIGHT_CLASS = 'max-h-[420px]';

/** モバイル feed（PostCard mx-3 px-4）と同じ表示幅: 100vw − 56px、最大 424px */
export const POST_IMAGE_FEED_WIDTH_CLASS =
  'w-[calc(100vw-3.5rem)] max-w-[424px] mx-auto';

/** デスクトップ投稿フォームのプレビュー最大幅（2:1 → 高さ 240px 相当） */
export const POST_IMAGE_PREVIEW_DESKTOP_CLASS = 'w-full max-w-[480px]';

type PostImageFrameProps = {
  src: string;
  alt: string;
  background?: string;
  overlay?: React.ReactNode;
  /** 後方互換のため受け付けるが未使用（元比率を確実に保つため常にネイティブ img で表示） */
  native?: boolean;
  className?: string;
};

export function PostImageFrame({
  src,
  alt,
  background,
  overlay,
  className = '',
}: PostImageFrameProps) {
  // 横長〜正方形: max-w-full で横幅いっぱい・高さ自動。
  // 縦長: max-h で高さが頭打ちになり、w-auto で横幅が比率に応じて縮む（中央寄せ）。
  const imgClass = `block h-auto w-auto max-w-full ${POST_IMAGE_MAX_HEIGHT_CLASS}`;
  return (
    <div className={`${POST_IMAGE_FRAME_CLASS} ${className}`}>
      <div
        className="relative max-w-full overflow-hidden rounded-2xl"
        style={background ? { background } : undefined}
      >
        <img src={src} alt={alt} className={imgClass} />
        {overlay}
      </div>
    </div>
  );
}
