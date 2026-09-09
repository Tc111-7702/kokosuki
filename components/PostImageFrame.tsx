'use client';

import Image from 'next/image';

/** 投稿一覧（PostCard）と同じ画像枠 */
export const POST_IMAGE_FRAME_CLASS =
  'relative w-full aspect-[3/2] lg:aspect-[2/1] rounded-2xl overflow-hidden';

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
  /** アップロードプレビュー等で Next Image を使わない場合 */
  native?: boolean;
  className?: string;
};

export function PostImageFrame({
  src,
  alt,
  background,
  overlay,
  native = false,
  className = '',
}: PostImageFrameProps) {
  return (
    <div
      className={`${POST_IMAGE_FRAME_CLASS} ${className}`}
      style={background ? { background } : undefined}
    >
      {native ? (
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 480px"
        />
      )}
      {overlay}
    </div>
  );
}
