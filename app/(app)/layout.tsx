'use client';

import { PageNav } from '@/components/PageNav';
import { BottomNav } from '@/components/BottomNav';
import { useIsMobile } from '@/lib/useIsMobile';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return isMobile ? (
    <div className="flex flex-col h-screen bg-[#F7F6F3]">
      <main className="flex-1 overflow-hidden h-full">
        {children}
      </main>
      <BottomNav />
    </div>
  ) : (
    <div className="flex h-screen bg-[#F7F6F3]">
      <PageNav />
      <main className="flex-1 overflow-hidden h-full">
        {children}
      </main>
    </div>
  );
}
