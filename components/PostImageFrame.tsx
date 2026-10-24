'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** 投稿一覧（PostCard）の画像枠。
 *  1:1 を基準に、横長〜正方形は横幅をデバイス幅に合わせて高さ自動、
 *  1:1 より縦長の写真は高さを基準値で固定して比率を保ったまま横幅を縮める（左寄せ＝横長と左端を揃える）。 */
export const POST_IMAGE_FRAME_CLASS = 'flex w-full justify-start';

/** 縦長写真の高さ上限（1:1 基準の目安。縦長が大きくなりすぎるのを防ぐ・調整可）。
 *  モバイル=320px、デスクトップ(lg+)=370px（+50px）。 */
export const POST_IMAGE_MAX_HEIGHT_CLASS = 'max-h-[320px] lg:max-h-[370px]';

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
  /** クリックで全画面ライトボックス（Twitter の画像拡大風）を開く */
  zoomable?: boolean;
  className?: string;
};

export function PostImageFrame({
  src,
  alt,
  background,
  overlay,
  zoomable = false,
  className = '',
}: PostImageFrameProps) {
  // 縦長(高さ>幅)のときだけ高さを基準値で固定し、横幅を比率に応じて縮める（左寄せ）。
  // 横長・正方形は横幅いっぱい・高さ自動（キャップしない）。縦横は画像ロード時に判定する。
  const [portrait, setPortrait] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // 拡大中は背面スクロールを止める。閉じるのは×ボタン、または上下スクロール
  // （デスクトップ=ホイール／モバイル=縦スワイプ）。
  useEffect(() => {
    if (!zoomed) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = () => setZoomed(false);
    const onWheel = (e: WheelEvent) => { if (Math.abs(e.deltaY) > 8) close(); };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      if (Math.abs((e.touches[0]?.clientY ?? 0) - startY) > 30) close();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [zoomed]);

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
          className={`${imgClass}${zoomable ? ' cursor-zoom-in' : ''}`}
          onClick={zoomable ? (e) => { e.stopPropagation(); setZoomed(true); } : undefined}
          onLoad={(e) => {
            const im = e.currentTarget;
            setPortrait(im.naturalHeight > im.naturalWidth);
          }}
        />
        {overlay}
      </div>

      {zoomable && zoomed && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          // 背景クリックでは閉じない＆投稿詳細にも伝播させない（Reactのportalはツリー経由で親に伝播するため）。
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <X size={22} />
          </button>
          {/* 画面横いっぱい・周囲は黒。縦長は画面内に収める。画像クリックでは閉じない。 */}
          <img
            src={src}
            alt={alt}
            className="max-h-screen max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
