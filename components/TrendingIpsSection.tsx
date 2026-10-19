'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type TrendingIP } from '@/components/community-types';
import { GachaAvatar } from '@/components/ui/GachaAvatar';
import { TrendingSection, TrendingRow } from '@/components/ui/TrendingCard';

/**
 * 「話題のIP」セクション（ホームの投稿一覧の右サイドと共通）。
 * - ips を渡すとそれを表示（親が /api/community/trending を取得済みの場合）。
 * - ips を渡さない場合は自前で /api/community/trending を取得する。
 * いずれも IP が無ければ何も描画しない。
 */
export function TrendingIpsSection({ ips }: { ips?: TrendingIP[] }) {
  const router = useRouter();
  const selfFetch = ips === undefined;
  const [fetched, setFetched] = useState<TrendingIP[]>([]);

  useEffect(() => {
    if (!selfFetch) return;
    let alive = true;
    fetch('/api/community/trending')
      .then((r) => r.json())
      .then((d) => { if (alive && d.trendingIPs) setFetched(d.trendingIPs); })
      .catch(() => {});
    return () => { alive = false; };
  }, [selfFetch]);

  const trendingIPs = ips ?? fetched;
  if (trendingIPs.length === 0) return null;

  return (
    <TrendingSection title="話題のIP">
      {trendingIPs.map((ip, i) => (
        <TrendingRow
          key={ip.ipName}
          rank={i + 1}
          isLast={i === trendingIPs.length - 1}
          avatar={
            <GachaAvatar
              imageUrl={ip.imageUrl}
              gradientFrom={ip.gradientFrom}
              gradientTo={ip.gradientTo}
              name={ip.ipName}
              size={38}
            />
          }
          title={ip.ipName}
          likeCount={ip.likeCount}
          onClick={() => router.push(`/home/search?ipName=${encodeURIComponent(ip.ipName)}&label=${encodeURIComponent(ip.ipName)}`)}
        />
      ))}
    </TrendingSection>
  );
}
