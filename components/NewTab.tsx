'use client';

import { OshiNewSection } from '@/components/OshiNewSection';
import { HorizontalGachaSection } from '@/components/HorizontalGachaSection';

export function NewTab() {
  return (
    <div className="flex-1 overflow-y-auto pb-4 space-y-4">
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
      <OshiNewSection />
      <HorizontalGachaSection
        title="今週発売"
        subtitle="Coming Soon"
        color="#4F46E5"
        colorDark="#1E1B6B"
        colorMid="#3730A3"
        apiUrl="/api/gacha/weekly-release"
        scrollId="coming-soon"
        showRank={false}
        badgeLabel="今週発売"
      />
      <HorizontalGachaSection
        title="再販・また引ける！"
        subtitle="Available Again"
        color="#10B981"
        colorDark="#065F46"
        colorMid="#059669"
        apiUrl="/api/gacha/reissue"
        scrollId="reissue"
        showRank={false}
        badgeLabel="発売中"
      />
      <HorizontalGachaSection
        title="キャラクター・マスコット"
        subtitle="Characters"
        color="#EC4899"
        colorDark="#831843"
        colorMid="#BE185D"
        apiUrl="/api/gacha/by-category?category=character"
        scrollId="cat-character"
        showRank={false}
        badgeLabel="発売中"
      />
      <HorizontalGachaSection
        title="アニメ・漫画・ゲーム"
        subtitle="Anime · Manga · Game"
        color="#8B5CF6"
        colorDark="#4C1D95"
        colorMid="#6D28D9"
        apiUrl="/api/gacha/by-category?category=anime"
        scrollId="cat-anime"
        showRank={false}
        badgeLabel="発売中"
      />
      <HorizontalGachaSection
        title="食べ物・動物・その他"
        subtitle="Food · Animal · Other"
        color="#F59E0B"
        colorDark="#92400E"
        colorMid="#B45309"
        apiUrl="/api/gacha/by-category?category=other"
        scrollId="cat-other"
        showRank={false}
        badgeLabel="発売中"
      />
    </div>
  );
}
