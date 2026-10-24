'use client';

import { useState } from 'react';

/** 投稿一覧（PostCard）の画像枠。
 *  1:1 を基準に、横長〜正方形は横幅をデバイス幅に合わせて高さ自動、
 *  1:1 より縦長の写真は高さを基準値で固定して比率を保ったまま横幅を縮める（左寄せ＝横長と左端を揃える）。 */
export const POST_IMAGE_FRAME_CLASS = 'flex w-full justify-start';

/** 縦長写真の高さ上限（1:1 基準の目安。縦長が大きくなりすぎるのを防ぐ・調整可）。 */
export const POST_IMAGE_MAX_HEIGHT_CLASS = 'max-h-[320px]';

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
  // 縦長(高さ>幅)のときだけ高さを基準値で固定し、横幅を比率に応じて縮める（左寄せ）。
  // 横長・正方形は横幅いっぱい・高さ自動（キャップしない）。縦横は画像ロード時に判定する。
  const [portrait, setPortrait] = useState(false);
  const imgClass = portrait
    ? `block h-auto w-auto max-w-full ${POST_IMAGE_MAX_HEIGHT_CLASS}`
    : 'block h-auto w-full';
  return (
    <div className={`${POST_IMAGE_FRAME_CLASS} ${className}`}>
      <div
        className="relative max-w-full overflow-hidden rounded-2xl"
        style={background ? { background } : undefined}
      >
        <img
          src={src}
          alt={alt}
          className={imgClass}
          onLoad={(e) => {
            const im = e.currentTarget;
            setPortrait(im.naturalHeight > im.naturalWidth);
          }}
        />
        {overlay}
      </div>
    </div>
  );
}
