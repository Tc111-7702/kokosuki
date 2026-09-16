'use client';

import { createPortal } from 'react-dom';
import mapImg from '@/components/ui/assets/signup-feature-map.png';
import { useIsMobile } from '@/lib/useIsMobile';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/desktopPageNav';

const MOBILE_BOTTOM_NAV_HEIGHT = 64;

interface Props {
  onAllow: () => void;
  onCancel: () => void;
}

/** マップ上に表示する位置情報許可プロンプト（Figma: 位置情報許可カード） */
export function MapLocationPermissionCard({ onAllow, onCancel }: Props) {
  const isMobile = useIsMobile();

  const overlayStyle = {
    top: 0,
    right: 0,
    bottom: isMobile ? MOBILE_BOTTOM_NAV_HEIGHT : 0,
    left: isMobile ? 0 : DESKTOP_PAGE_NAV_WIDTH,
  } as const;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[100] flex items-center justify-center px-6"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-location-permission-title"
    >
      <div
        className="w-full max-w-[320px] bg-white rounded-[20px] px-6 pt-5 pb-6"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mapImg.src}
          alt=""
          width={mapImg.width}
          height={mapImg.height}
          className="w-full max-w-[200px] mx-auto h-auto mb-4"
        />
        <p
          id="map-location-permission-title"
          className="text-center text-[13px] md:text-[14px] font-bold leading-relaxed text-[#333] mb-5"
        >
          近くのガチャ情報を表示するために、現在地の情報を使用します。
        </p>
        <button
          type="button"
          onClick={onAllow}
          className="w-full py-3.5 rounded-full text-white text-[15px] font-bold active:opacity-90 mb-3 cursor-pointer"
          style={{ background: '#FFCD31', touchAction: 'manipulation' }}
        >
          位置情報を許可
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-1 text-[14px] font-bold active:opacity-70 bg-transparent border-none cursor-pointer"
          style={{ color: '#FFCD31', touchAction: 'manipulation' }}
        >
          キャンセル
        </button>
      </div>
    </div>,
    document.body,
  );
}
