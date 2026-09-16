'use client';

import mapImg from '@/components/ui/assets/signup-feature-map.png';

interface Props {
  onAllow: () => void;
  onCancel: () => void;
}

/** マップ上に表示する位置情報許可プロンプト（Figma: 位置情報許可カード） */
export function MapLocationPermissionCard({ onAllow, onCancel }: Props) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-location-permission-title"
    >
      <div
        className="w-full max-w-[320px] bg-white rounded-[20px] px-6 pt-5 pb-6 pointer-events-auto"
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
          className="w-full py-3.5 rounded-full text-white text-[15px] font-bold active:opacity-90 mb-3"
          style={{ background: '#FFCD31' }}
        >
          位置情報を許可
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-1 text-[14px] font-bold active:opacity-70 bg-transparent border-none cursor-pointer"
          style={{ color: '#FFCD31' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
