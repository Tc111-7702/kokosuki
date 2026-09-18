'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { useIsMobile } from '@/lib/useIsMobile';
import { DESKTOP_PAGE_NAV_WIDTH } from '@/lib/desktopPageNav';

const SCROLL_CLOSE_DELTA = 28;
const SWIPE_CLOSE_DELTA = 40;
const CLOSE_ANIM_MS = 340;
const MOBILE_BREAKPOINT = 768;
const MOBILE_BOTTOM_NAV_HEIGHT = 64;

// ─── 経路アプリ選択モーダル ────────────────────────────────────────────────────
// store/page.tsx と SpotDetailSheet.tsx の両方から使う共通コンポーネント

interface NavPickerModalProps {
  lat: number;
  lng: number;
  name: string;
  currentPos: { lat: number; lng: number } | null;
  onClose: () => void;
}

export default function NavPickerModal({ lat, lng, name, currentPos, onClose }: NavPickerModalProps) {
  const dragStartY = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);

  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );

  const bottomOffset = isMobile ? MOBILE_BOTTOM_NAV_HEIGHT : 0;
  const mainAreaLeft = isMobile ? 0 : DESKTOP_PAGE_NAV_WIDTH;
  const mainAreaInsetStyle = {
    top: 0,
    right: 0,
    bottom: bottomOffset,
    left: mainAreaLeft,
  } as const;

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, CLOSE_ANIM_MS);
  }, [onClose]);

  const openExternalApp = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    requestClose();
  }, [requestClose]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    const closeOnScrollUp = (e: WheelEvent) => {
      if (e.deltaY < -SCROLL_CLOSE_DELTA) requestClose();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const y = e.touches[0]?.clientY;
      if (y == null) return;
      // 指を下にスワイプ（＝上方向スクロール）で閉じる。wheel の closeOnScrollUp と揃える。
      if (y - touchStartY.current > SWIPE_CLOSE_DELTA) {
        touchStartY.current = null;
        requestClose();
      }
    };
    const resetTouch = () => { touchStartY.current = null; };

    window.addEventListener('wheel', closeOnScrollUp, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', resetTouch, { passive: true });
    window.addEventListener('touchcancel', resetTouch, { passive: true });

    return () => {
      window.removeEventListener('wheel', closeOnScrollUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', resetTouch);
      window.removeEventListener('touchcancel', resetTouch);
    };
  }, [requestClose]);

  const sheetBg = isDark ? '#0a0a0a' : 'white';
  const titleColor = isDark ? '#ffffff' : '#1a1a1a';
  const subtitleColor = isDark ? '#a3a3a3' : '#aaa';
  const handleColor = isDark ? '#404040' : '#E0E0E0';
  const appBtnBg = isDark ? '#1a1a1a' : '#F5F3ED';
  const appBtnColor = isDark ? '#f5f5f5' : '#1a1a1a';
  const cancelBtnBg = isDark ? '#262626' : '#F0F0F0';
  const cancelBtnColor = isDark ? '#d4d4d4' : '#888';

  const dst = `${lat},${lng}`;
  const src = currentPos ? `${currentPos.lat},${currentPos.lng}` : '';

  const apps = [
    {
      name: 'Google マップ',
      url: src
        ? `https://www.google.com/maps/dir/?api=1&origin=${src}&destination=${dst}&travelmode=walking`
        : `https://www.google.com/maps/dir/?api=1&destination=${dst}&travelmode=walking`,
    },
    { name: 'Yahoo! カーナビ', url: `https://map.yahoo.co.jp/route/walk?from=${src}&to=${dst}` },
    { name: 'Apple マップ', url: `https://maps.apple.com/?daddr=${dst}${src ? `&saddr=${src}` : ''}&dirflg=w` },
  ];

  return (
    <>
      <div
        className="fixed z-[60]"
        style={{
          ...mainAreaInsetStyle,
          background: 'rgba(0,0,0,0.45)',
          opacity: closing ? 0 : 1,
          transition: `opacity ${CLOSE_ANIM_MS}ms ease-out`,
          pointerEvents: closing ? 'none' : 'auto',
        }}
        onClick={requestClose}
        onWheel={e => { if (e.deltaY < -SCROLL_CLOSE_DELTA) requestClose(); }}
      />
      <div
        className="fixed z-[70] overflow-hidden pointer-events-none"
        style={mainAreaInsetStyle}
      >
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col select-none"
          style={{
            background: sheetBg,
            borderRadius: '20px 20px 0 0',
            boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.55)' : '0 -4px 24px rgba(0,0,0,0.2)',
            borderTop: isDark ? '1px solid #262626' : undefined,
            transform: closing ? 'translateY(100%)' : 'translateY(0)',
            transition: `transform ${CLOSE_ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            pointerEvents: closing ? 'none' : 'auto',
          }}
          onWheel={e => { if (e.deltaY < -SCROLL_CLOSE_DELTA) requestClose(); }}
          onPointerDown={e => {
            if (closing) return;
            if ((e.target as HTMLElement).closest('a, button')) return;
            dragStartY.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (dragStartY.current === null) return;
            if (dragStartY.current - e.clientY > SWIPE_CLOSE_DELTA) {
              dragStartY.current = null;
              requestClose();
            }
          }}
          onPointerUp={() => { dragStartY.current = null; }}
          onPointerCancel={() => { dragStartY.current = null; }}
        >
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: handleColor }} />
        </div>
        <div className="px-4 pt-2 pb-1">
          <p className="text-[15px] font-black" style={{ color: titleColor }}>経路アプリを選択</p>
          <p className="text-[12px] mt-0.5" style={{ color: subtitleColor }}>{name}</p>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3">
          {apps.map(app => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                openExternalApp(app.url);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: appBtnBg, textDecoration: 'none' }}
            >
              <span className="text-[15px] font-bold" style={{ color: appBtnColor }}>{app.name}</span>
            </a>
          ))}
        </div>
        <div className="px-4 pb-8 pt-1">
          <button onClick={requestClose} className="w-full py-3 rounded-2xl text-[14px] font-bold"
            style={{ background: cancelBtnBg, color: cancelBtnColor }}>
            キャンセル
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
