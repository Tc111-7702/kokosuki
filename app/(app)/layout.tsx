'use client';

import { usePathname } from 'next/navigation';
import { PageNav } from '@/components/PageNav';
import { BottomNav } from '@/components/BottomNav';
import { SessionGuard } from '@/components/SessionGuard';
import { useIsMobile } from '@/lib/useIsMobile';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const MOBILE_BREAKPOINT = 768;
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const pathname = usePathname();
  const hideNav =
    pathname.startsWith('/report') ||
    pathname.startsWith('/settings/inquiry') ||
    pathname.startsWith('/settings/email') ||
    pathname.startsWith('/notifications/announcements/');

  return isMobile ? (
    <div className="flex flex-col h-screen bg-[#F7F6F3]">
      <SessionGuard />
      <main className="flex-1 overflow-hidden h-full">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  ) : (
    <div className="flex h-screen bg-[#F7F6F3]">
      <SessionGuard />
      {!hideNav && <PageNav />}
      <main className="flex-1 overflow-hidden h-full">
        {children}
      </main>
    </div>
  );
}
