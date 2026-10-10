'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { GachaDetailView } from '@/components/GachaDetailView';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/layout';

interface GachaDetailContextValue {
  openGacha: (id: string) => void;
  closeGacha: () => void;
}

const GachaDetailContext = createContext<GachaDetailContextValue>({
  openGacha: () => {},
  closeGacha: () => {},
});

/** ガチャ詳細をオーバーレイで開く。プロバイダ外（例: 新規登録フロー）では no-op。 */
export const useGachaDetail = () => useContext(GachaDetailContext);

/**
 * ガチャ詳細をアプリ全体の最前面にオーバーレイ表示する。
 * ルート遷移ではないので、ホーム/マップはアンマウントされず（＝閉じても再読み込みなし）、
 * マップの店舗詳細シート(z-50/60)より上(z-[100])に重なる。
 */
export function GachaDetailProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const isMobile = useIsMobile(768);

  const openGacha = useCallback((id: string) => setOpenId(id), []);
  const closeGacha = useCallback(() => setOpenId(null), []);

  // オーバーレイ表示中は背面のスクロールを止める。
  useEffect(() => {
    if (openId === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [openId]);

  return (
    <GachaDetailContext.Provider value={{ openGacha, closeGacha }}>
      {children}
      {openId !== null && (
        // サイドバー(デスクトップ左)/ボトムバー(モバイル下)を隠さないよう、
        // オーバーレイはナビを除いたコンテンツ領域だけに配置する。
        <div
          className="fixed z-[100]"
          style={isMobile
            ? { top: 0, left: 0, right: 0, bottom: 'calc(64px + env(safe-area-inset-bottom))', background: '#FFFFFF' }
            : { top: 0, right: 0, bottom: 0, left: DESKTOP_PAGE_NAV_WIDTH, background: '#FFFFFF' }}
        >
          <GachaDetailView gachaId={openId} onClose={closeGacha} />
        </div>
      )}
    </GachaDetailContext.Provider>
  );
}
