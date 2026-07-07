'use client';

import { OshiNewSection } from '@/components/OshiNewSection';
import { HorizontalGachaSection } from '@/components/HorizontalGachaSection';

export function NewTab() {
  return (
    <div className="flex-1 overflow-y-auto pb-4 space-y-6">
      <OshiNewSection />
      <HorizontalGachaSection
        title="話題のガチャ"
        subtitle="Trending Now"
        color="#E53E6A"
        colorDark="#7B003A"
        colorMid="#C8004A"
        apiUrl="/api/gacha/popular?limit=10"
        scrollId="trending"
        showRank
      />
      <HorizontalGachaSection
        title="もうすぐ発売"
        subtitle="Coming Soon"
        color="#4F46E5"
        colorDark="#1E1B6B"
        colorMid="#3730A3"
        apiUrl="/api/gacha/coming-soon"
        scrollId="coming-soon"
        showRank={false}
      />
    </div>
  );
}
