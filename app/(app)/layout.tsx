'use client';

import { SunlitProvider } from '@/lib/sunlit/store';
import { PageNav } from '@/components/feature/PageNav';
import { BottomNav } from '@/components/feature/BottomNav';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <SunlitProvider>
      {isMobile ? (
        /* モバイル: コンテンツ上 + ボトムナビ下 */
        <div className="flex flex-col h-screen bg-[#F7F6F3]">
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
          <BottomNav />
        </div>
      ) : (
        /* デスクトップ: サイドバー左 + コンテンツ右 */
        <div className="flex h-screen bg-[#F7F6F3]">
          <PageNav />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      )}
    </SunlitProvider>
  );
}
