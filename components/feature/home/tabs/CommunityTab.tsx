'use client';

import { useRouter } from 'next/navigation';
import { useSunlit } from '@/lib/sunlit/store';
import { PullGridCard, StockScrollCard } from '@/components/sunlit/ui/FeedCard';
import { useIsMobile } from '@/lib/useIsMobile';

export function CommunityTab() {
  const { feedItems } = useSunlit();
  const router = useRouter();
  const isMobile = useIsMobile();
  const tapFeed = (id: string) => router.push(`/feed/${id}`);

  const pullItems   = feedItems.filter((item) => item.type === 'pull');
  const reportItems = feedItems.filter((item) => item.type === 'report');

  return (
    <div className="flex-1 overflow-y-auto">

      {/* 上半分: ガチャ引き投稿 3列グリッド */}
      <div className="px-3 pt-4">
        {pullItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[14px] font-bold text-[#CCC]">まだ引き投稿がありません</p>
          </div>
        ) : (
          <div className={isMobile ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-2'}>
            {pullItems.map((item) => (
              <PullGridCard
                key={item.id}
                item={item}
                tall={isMobile}
                onTap={() => tapFeed(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 下半分: 在庫状況 (横スクロール) */}
      {reportItems.length > 0 && (
        <div className="space-y-2 pt-7 pb-4">
          <div className="flex items-center justify-between px-4">
            <p className="text-[14px] font-black text-[#111]">在庫状況レポート</p>
            <span className="text-[11px] font-bold text-[#AAA]">{reportItems.length}件</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto overflow-y-hidden scrollbar-hide px-4 pb-1">
            {reportItems.map((item) => (
              <StockScrollCard
                key={item.id}
                item={item}
                onTap={() => tapFeed(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
