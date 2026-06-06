import type { Metadata } from 'next';
import { SunlitProvider } from '@/lib/sunlit/store';

export const metadata: Metadata = {
  title: 'Mikke! デモ',
  description: 'リアルタイム・ガチャ在庫マップ（UI/UXプロトタイプ）',
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <SunlitProvider>
      <div className="flex items-center justify-center min-h-dvh bg-[#EDECEB]">
        {children}
      </div>
    </SunlitProvider>
  );
}
