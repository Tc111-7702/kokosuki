'use client';

import { useEffect, useRef } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapHeight?: 'half' | 'tall' | 'full';
}

export function BottomSheet({
  open,
  onClose,
  children,
  snapHeight = 'half',
}: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const heights = {
    half: 'max-h-[55vh]',
    tall: 'max-h-[75vh]',
    full: 'max-h-[92vh]',
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-t-2xl ${heights[snapHeight]} flex flex-col overflow-hidden`}
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.10)' }}
      >
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#E0DFDB]" />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
