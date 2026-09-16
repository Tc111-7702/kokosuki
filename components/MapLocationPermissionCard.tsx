'use client';

interface Props {
  onAllow: () => void;
  onCancel: () => void;
  /** ブラウザ設定で拒否済み */
  browserDenied?: boolean;
}

/** マップ上に表示する位置情報許可プロンプト（Figma: 位置情報許可カード） */
export function MapLocationPermissionCard({ onAllow, onCancel, browserDenied = false }: Props) {
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="map-location-permission-layer absolute inset-0 flex items-center justify-center px-6"
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-location-permission-title"
      onPointerDown={stop}
    >
      <div
        className="w-full max-w-[320px] bg-white dark:bg-[#1c1c1e] rounded-[20px] px-6 pt-5 pb-6"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', pointerEvents: 'auto' }}
        onPointerDown={stop}
      >
        <p
          id="map-location-permission-title"
          className="text-center text-[13px] md:text-[14px] font-bold leading-relaxed text-[#333] dark:text-white mb-3"
        >
          近くのガチャ情報を表示するために、現在地の情報を使用します。
        </p>
        {browserDenied ? (
          <p className="text-center text-[11px] md:text-[12px] leading-relaxed text-[#E5484D] font-semibold mb-4">
            ブラウザで位置情報がブロックされています。アドレスバー横の設定から、このサイトの位置情報を許可してください。
          </p>
        ) : (
          <p className="text-center text-[11px] md:text-[12px] leading-relaxed text-[#888] dark:text-[#b3b3b3] mb-4">
            「位置情報を許可」を押すと、ブラウザの許可ダイアログが表示されます。
          </p>
        )}
        <button
          type="button"
          onPointerDown={(e) => { stop(e); onAllow(); }}
          className="w-full py-3.5 rounded-full text-white text-[15px] font-bold active:opacity-90 mb-3 cursor-pointer relative"
          style={{ background: '#FFCD31', touchAction: 'manipulation' }}
        >
          位置情報を許可
        </button>
        <button
          type="button"
          onPointerDown={(e) => { stop(e); onCancel(); }}
          className="w-full py-1 text-[14px] font-bold active:opacity-70 bg-transparent border-none cursor-pointer relative"
          style={{ color: '#FFCD31', touchAction: 'manipulation' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
